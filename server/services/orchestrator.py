"""
Agent orchestration service.

Dispatches Browser Use agents as async background tasks,
tracks their runs, and chains eligibility -> PA -> status flows.

Owned by Dev 1. Skeleton for Phase 1-2 implementation.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, UTC
from pathlib import Path
from typing import Optional, Callable, Awaitable

try:
    from lmnr import Laminar, observe
except Exception:  # noqa: BLE001
    Laminar = None  # type: ignore[assignment]

    def observe(**_kwargs):  # type: ignore[no-redef]
        def _decorator(fn):
            return fn

        return _decorator

from shared.models import AgentType, Portal, AgentRun, EligibilityResult, PARequest, PAStatusUpdate
from server.observability import initialize_laminar
from server.services.convex_client import convex_client
from tools import db_client
from shared.constants import (
    MAX_AGENT_RETRIES,
    RETRY_BACKOFF_BASE,
    AGENT_RUN_TIMEOUT,
)

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("output")
FIXTURES_DIR = Path("data/fixtures")
CHARTS_DIR = Path("data/charts")
# Default off for local/test stability. Real agent execution can be enabled explicitly.
ENABLE_AGENT_EXECUTION = os.getenv("ENABLE_AGENT_EXECUTION", "false").lower() == "true"
RUN_MAX_STEPS = {
    AgentType.ELIGIBILITY: 25,
    AgentType.PA_FORM_FILLER: 40,
    AgentType.STATUS_MONITOR: 15,
}


@observe(
    name="orchestrator.dispatch_eligibility",
    tags=["component:orchestrator", "flow:eligibility"],
    ignore_input=True,
    ignore_output=True,
)
async def dispatch_eligibility(mrn: str, portal: Portal = Portal.STEDI) -> str:
    run_id = f"elig-{mrn}-{int(datetime.now(UTC).timestamp())}"
    await _start_run(run_id, AgentType.ELIGIBILITY, mrn, portal)
    task = asyncio.create_task(_run_with_retry(run_id, AgentType.ELIGIBILITY, mrn, portal, _run_eligibility))
    _running_tasks[run_id] = task
    return run_id


@observe(
    name="orchestrator.dispatch_pa_submission",
    tags=["component:orchestrator", "flow:pa_submission"],
    ignore_input=True,
    ignore_output=True,
)
async def dispatch_pa_submission(mrn: str, portal: Portal = Portal.COVERMYMEDS) -> str:
    run_id = f"pa-{mrn}-{int(datetime.now(UTC).timestamp())}"
    await _start_run(run_id, AgentType.PA_FORM_FILLER, mrn, portal)
    task = asyncio.create_task(_run_with_retry(run_id, AgentType.PA_FORM_FILLER, mrn, portal, _run_pa_submission))
    _running_tasks[run_id] = task
    return run_id


@observe(
    name="orchestrator.dispatch_status_check",
    tags=["component:orchestrator", "flow:status_check"],
    ignore_input=True,
    ignore_output=True,
)
async def dispatch_status_check(mrn: str, portal: Optional[Portal] = None) -> str:
    run_id = f"status-{mrn}-{int(datetime.now(UTC).timestamp())}"
    await _start_run(run_id, AgentType.STATUS_MONITOR, mrn, portal or Portal.COVERMYMEDS)
    task = asyncio.create_task(_run_with_retry(run_id, AgentType.STATUS_MONITOR, mrn, portal or Portal.COVERMYMEDS, _run_status_check))
    _running_tasks[run_id] = task
    return run_id


@observe(
    name="orchestrator.dispatch_full_flow",
    tags=["component:orchestrator", "flow:full_flow"],
    ignore_input=True,
    ignore_output=True,
)
async def dispatch_full_flow(mrn: str) -> dict:
    """Run full chain: eligibility -> optional PA -> optional status monitor."""
    elig_run_id = await dispatch_eligibility(mrn)
    elig_status = await wait_for_run(elig_run_id)

    if not elig_status or not elig_status.get("success"):
        return {
            "eligibility_run_id": elig_run_id,
            "pa_run_id": None,
            "status_run_id": None,
            "pa_required": None,
        }

    pa_required = _read_pa_required(mrn)
    pa_run_id: Optional[str] = None
    status_run_id: Optional[str] = None
    if pa_required:
        pa_run_id = await dispatch_pa_submission(mrn)
        await wait_for_run(pa_run_id)
        status_run_id = await dispatch_status_check(mrn)

    return {
        "eligibility_run_id": elig_run_id,
        "pa_run_id": pa_run_id,
        "status_run_id": status_run_id,
        "pa_required": pa_required,
    }


# ──────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────

_running_tasks: dict[str, asyncio.Task] = {}
_run_states: dict[str, dict] = {}
_convex_run_doc_ids: dict[str, str] = {}
_pa_results: dict[str, dict] = {}  # mrn -> PA submission output


def _is_live_execution(agent_type: AgentType) -> bool:
    # Eligibility is always a real live agent run.
    if agent_type == AgentType.ELIGIBILITY:
        return True
    return ENABLE_AGENT_EXECUTION


def _artifact_path_for(agent_type: AgentType, mrn: str) -> Optional[Path]:
    mapping = {
        AgentType.ELIGIBILITY: OUTPUT_DIR / f"eligibility_{mrn}.json",
        AgentType.PA_FORM_FILLER: OUTPUT_DIR / f"pa_submission_{mrn}.json",
        AgentType.STATUS_MONITOR: OUTPUT_DIR / f"status_{mrn}.json",
    }
    return mapping.get(agent_type)


def _artifact_written_after_start(run_state: dict) -> bool:
    try:
        agent_type = AgentType(run_state["agent_type"])
        mrn = str(run_state["mrn"])
        started_at = datetime.fromisoformat(str(run_state["started_at"]))
    except Exception:
        return False

    artifact = _artifact_path_for(agent_type, mrn)
    if artifact is None or not artifact.exists():
        return False
    try:
        written_at = datetime.fromtimestamp(artifact.stat().st_mtime, tz=UTC)
    except Exception:
        return False
    return written_at >= started_at


def _log_step(run_id: str, message: str):
    """Append a timestamped log entry to a run's activity log."""
    state = _run_states.get(run_id)
    if state is not None:
        ts = datetime.now(UTC).strftime("%H:%M:%S")
        state.setdefault("logs", []).append(f"[{ts}] {message}")


@observe(
    name="orchestrator.start_run",
    tags=["component:orchestrator"],
    ignore_input=True,
    ignore_output=True,
)
async def _start_run(run_id: str, agent_type: AgentType, mrn: str, portal: Portal):
    run = AgentRun(
        id=run_id,
        agent_type=agent_type,
        mrn=mrn,
        portal=portal,
        started_at=datetime.now(UTC),
        steps_taken=0,
        max_steps=RUN_MAX_STEPS[agent_type],
    )
    _run_states[run_id] = {
        "run_id": run_id,
        "agent_type": agent_type.value,
        "mrn": mrn,
        "portal": portal.value,
        "status": "started",
        "execution_mode": "live" if _is_live_execution(agent_type) else "fixture",
        "started_at": run.started_at.isoformat(),
        "completed_at": None,
        "success": None,
        "error_message": None,
        "gif_path": None,
        "logs": [],
    }
    _log_step(run_id, f"Agent run created — {agent_type.value} for {mrn} on {portal.value}")
    await _persist_run(run)


@observe(
    name="orchestrator.run_with_retry",
    tags=["component:orchestrator"],
    ignore_input=True,
    ignore_output=True,
)
async def _run_with_retry(run_id: str, agent_type: AgentType, mrn: str, portal: Portal, fn: Callable[[str, Portal], Awaitable[None]]):
    initialize_laminar()
    if Laminar and Laminar.is_initialized():
        Laminar.set_trace_session_id(run_id)
        Laminar.set_trace_metadata(
            {
                "component": "orchestrator",
                "agent_type": agent_type.value,
                "portal": portal.value,
                "execution_mode": "live" if _is_live_execution(agent_type) else "fixture",
            }
        )
    attempt = 0
    while attempt < MAX_AGENT_RETRIES:
        try:
            _log_step(run_id, f"Attempt {attempt + 1}/{MAX_AGENT_RETRIES} — starting {agent_type.value} agent")
            await asyncio.wait_for(fn(mrn, portal), timeout=AGENT_RUN_TIMEOUT)
            _log_step(run_id, "Agent execution completed successfully")
            await _complete_run(run_id, success=True)
            return
        except Exception as exc:  # noqa: BLE001
            attempt += 1
            _log_step(run_id, f"Attempt {attempt} failed: {str(exc)[:200]}")
            _run_states[run_id]["status"] = "retrying"
            if attempt >= MAX_AGENT_RETRIES:
                _log_step(run_id, f"All {MAX_AGENT_RETRIES} attempts exhausted — marking as failed")
                await _complete_run(run_id, success=False, error=str(exc))
                return
            _log_step(run_id, f"Retrying in {RETRY_BACKOFF_BASE * attempt}s…")
            await asyncio.sleep(RETRY_BACKOFF_BASE * attempt)


@observe(
    name="orchestrator.run_eligibility",
    span_type="TOOL",
    tags=["component:orchestrator", "agent:eligibility"],
    ignore_input=True,
    ignore_output=True,
)
async def _run_eligibility(mrn: str, portal: Portal):
    run_id = next((rid for rid, s in _run_states.items() if s["mrn"] == mrn and s["agent_type"] == "eligibility" and s["status"] in ("started", "retrying")), None)
    if run_id:
        _log_step(run_id, "Loading patient chart data")
    if _is_live_execution(AgentType.ELIGIBILITY):
        from agents.eligibility_checker import check_eligibility_stedi
        if run_id:
            _log_step(run_id, "Connecting to Stedi eligibility API")
        result = await check_eligibility_stedi(mrn)
        if not result:
            raise RuntimeError(f"Eligibility agent returned empty result for {mrn}")
        if run_id:
            _log_step(run_id, "Eligibility response received — parsing results")
        output_file = OUTPUT_DIR / f"eligibility_{mrn}.json"
        if not output_file.exists():
            raise RuntimeError(f"Eligibility output file was not created for {mrn}")
    else:
        if run_id:
            _log_step(run_id, "Using fixture data (ENABLE_AGENT_EXECUTION=false)")
        await _write_fixture_output(mrn, "eligibility")
    if run_id:
        _log_step(run_id, "Persisting eligibility output to storage")
    await _persist_output_file(mrn, "eligibility")


@observe(
    name="orchestrator.run_pa_submission",
    span_type="TOOL",
    tags=["component:orchestrator", "agent:pa_form_filler"],
    ignore_input=True,
    ignore_output=True,
)
async def _run_pa_submission(mrn: str, portal: Portal):
    run_id = next((rid for rid, s in _run_states.items() if s["mrn"] == mrn and s["agent_type"] == "pa_form_filler" and s["status"] in ("started", "retrying")), None)
    if run_id:
        _log_step(run_id, "Loading patient chart and clinical data")
    if ENABLE_AGENT_EXECUTION:
        from agents.pa_form_filler import fill_covermymeds_pa
        if run_id:
            _log_step(run_id, "Launching Browser Use agent for CoverMyMeds")
            _log_step(run_id, "Navigating to CoverMyMeds portal")
            _log_step(run_id, "Authenticating with portal credentials")
        await fill_covermymeds_pa(mrn)
        if run_id:
            _log_step(run_id, "PA form filled and submitted via browser automation")
            # Check for GIF recording
            gif_file = OUTPUT_DIR / f"pa_submission_{mrn}.gif"
            if gif_file.exists():
                _run_states[run_id]["gif_path"] = str(gif_file)
                _log_step(run_id, f"Agent recording saved: {gif_file.name}")
    else:
        if run_id:
            _log_step(run_id, "Using fixture data (ENABLE_AGENT_EXECUTION=false)")
        await _write_fixture_output(mrn, "pa_submission")
    if run_id:
        _log_step(run_id, "Persisting PA submission output to storage")
    await _persist_output_file(mrn, "pa_submission")


@observe(
    name="orchestrator.run_status_check",
    span_type="TOOL",
    tags=["component:orchestrator", "agent:status_monitor"],
    ignore_input=True,
    ignore_output=True,
)
async def _run_status_check(mrn: str, portal: Portal):
    run_id = next((rid for rid, s in _run_states.items() if s["mrn"] == mrn and s["agent_type"] == "status_monitor" and s["status"] in ("started", "retrying")), None)
    if run_id:
        _log_step(run_id, "Looking up patient information")
    if ENABLE_AGENT_EXECUTION:
        from agents.status_monitor import monitor_covermymeds
        patient_name = _lookup_patient_name(mrn)
        if run_id:
            _log_step(run_id, f"Connecting to CoverMyMeds to check status for {patient_name}")
        result = await monitor_covermymeds(mrn, patient_name)
        if not result:
            raise RuntimeError(f"Status monitor returned empty result for {mrn}")
        if run_id:
            _log_step(run_id, "Status check response received from portal")
        output_file = OUTPUT_DIR / f"status_{mrn}.json"
        if not output_file.exists():
            raise RuntimeError(f"Status output file was not created for {mrn}")
    else:
        if run_id:
            _log_step(run_id, "Using fixture data (ENABLE_AGENT_EXECUTION=false)")
        await _write_fixture_output(mrn, "status")
    if run_id:
        _log_step(run_id, "Persisting status update to storage")
    await _persist_output_file(mrn, "status")


def _lookup_patient_name(mrn: str) -> str:
    """Load patient name from chart file. Falls back to MRN if not found."""
    chart_file = CHARTS_DIR / f"{mrn}.json"
    if chart_file.exists():
        try:
            with open(chart_file) as f:
                data = json.load(f)
            patient = data.get("patient", {})
            first = patient.get("first_name", "")
            last = patient.get("last_name", "")
            if first and last:
                return f"{first} {last}"
        except Exception:
            logger.warning("Failed to load patient name from chart %s", mrn, exc_info=True)
    return mrn


async def _persist_run(run: AgentRun):
    if convex_client.enabled:
        try:
            payload = {
                "runId": run.id,
                "agentType": run.agent_type.value,
                "mrn": run.mrn,
                "portal": run.portal.value,
                "startedAt": int(run.started_at.timestamp() * 1000),
                "stepsTaken": run.steps_taken,
                "maxSteps": run.max_steps,
            }
            if run.completed_at is not None:
                payload["completedAt"] = int(run.completed_at.timestamp() * 1000)
            if run.success is not None:
                payload["success"] = run.success
            if run.error_message:
                payload["errorMessage"] = run.error_message
            if run.gif_path:
                payload["gifPath"] = run.gif_path

            doc_id = await convex_client.mutation("agentRuns:create", payload)
            if doc_id:
                _convex_run_doc_ids[run.id] = str(doc_id)
            return
        except Exception:
            logger.warning("Failed to persist agent run to Convex", exc_info=True)


async def _complete_run(run_id: str, success: bool, error: Optional[str] = None):
    completed_at = datetime.now(UTC)
    state = _run_states.get(run_id)
    if state:
        state["status"] = "completed" if success else "failed"
        state["completed_at"] = completed_at.isoformat()
        state["success"] = success
        state["error_message"] = error
        if success:
            _log_step(run_id, "Run completed successfully")
        else:
            _log_step(run_id, f"Run failed: {error or 'unknown error'}")

    if convex_client.enabled:
        try:
            convex_doc_id = _convex_run_doc_ids.get(run_id)
            if convex_doc_id:
                await convex_client.mutation(
                    "agentRuns:complete",
                    {
                        "id": convex_doc_id,
                        "completedAt": int(completed_at.timestamp() * 1000),
                        "stepsTaken": 0,
                        **({"success": success} if success is not None else {}),
                        **({"errorMessage": error} if error else {}),
                    },
                )
        except Exception:
            pass

async def _persist_output_file(mrn: str, prefix: str):
    # Read output file and push into Convex via db_client helpers
    if prefix == "eligibility":
        path = f"output/eligibility_{mrn}.json"
        try:
            with open(path) as f:
                data = json.load(f)
            result = EligibilityResult(
                mrn=data.get("mrn", mrn),
                portal=Portal(data.get("portal", Portal.STEDI.value)),
                payer=data.get("payer", ""),
                coverage_active=data.get("coverage_active", True),
                copay=data.get("copay"),
                deductible=data.get("deductible"),
                out_of_pocket_max=data.get("out_of_pocket_max"),
                pa_required=data.get("pa_required", True),
                pa_required_reason=data.get("pa_required_reason"),
                raw_response=data.get("raw_response"),
                checked_at=datetime.now(UTC),
            )
            await db_client.save_eligibility_result(result)
        except Exception:
            logger.warning("Failed to persist eligibility output for %s", mrn, exc_info=True)
    elif prefix == "pa_submission":
        path = f"output/pa_submission_{mrn}.json"
        try:
            with open(path) as f:
                data = json.load(f)
            # Store in memory so the PA list endpoint can find it immediately
            _pa_results[mrn] = data
            now = datetime.now(UTC)
            pa = PARequest(
                mrn=data.get("mrn", mrn),
                portal=Portal.COVERMYMEDS,
                medication_or_procedure=data.get("medication_or_procedure", ""),
                status=data.get("status", "submitted"),
                fields_filled=data.get("fields_filled", []),
                gaps_detected=data.get("gaps_detected", []),
                justification_summary=data.get("justification_summary"),
                submission_id=data.get("submission_id"),
                gif_path=data.get("gif_path"),
                created_at=now,
                updated_at=now,
            )
            await db_client.save_pa_request(pa)
        except Exception:
            logger.warning("Failed to persist PA submission output for %s", mrn, exc_info=True)
    elif prefix == "status":
        path = f"output/status_{mrn}.json"
        try:
            with open(path) as f:
                data = json.load(f)
            update = PAStatusUpdate(
                request_id=data.get("request_id", ""),
                mrn=mrn,
                portal=Portal.COVERMYMEDS,
                status=data.get("status"),
                determination_date=data.get("determination_date"),
                denial_reason=data.get("denial_reason"),
                notes=data.get("notes"),
                checked_at=datetime.now(UTC),
            )
            await db_client.save_status_update(update)
        except Exception:
            logger.warning(
                "Failed to persist status output for %s",
                mrn, exc_info=True,
            )


async def _write_fixture_output(mrn: str, prefix: str):
    OUTPUT_DIR.mkdir(exist_ok=True)
    mapping = {
        "eligibility": ("eligibility_sample.json", f"eligibility_{mrn}.json"),
        "pa_submission": ("pa_submission_sample.json", f"pa_submission_{mrn}.json"),
        "status": ("status_update_sample.json", f"status_{mrn}.json"),
    }
    fixture_name, output_name = mapping[prefix]
    fixture_path = FIXTURES_DIR / fixture_name
    if not fixture_path.exists():
        return
    with open(fixture_path) as f:
        data = json.load(f)
    data["mrn"] = mrn
    with open(OUTPUT_DIR / output_name, "w") as f:
        json.dump(data, f, indent=2, default=str)


async def get_run_status(run_id: str) -> Optional[dict]:
    # In-memory state for current server process (immediate polling path).
    if run_id in _run_states:
        task = _running_tasks.get(run_id)
        state = dict(_run_states[run_id])
        if task is not None:
            if task.done() and state["status"] in ("started", "retrying"):
                exc = task.exception() if not task.cancelled() else None
                state["status"] = "failed" if exc else "completed"
                if exc:
                    state["error_message"] = str(exc)
            state["task_done"] = task.done()
        return state

    # Fallback for process restarts: query Convex by run_id if available.
    if convex_client.enabled:
        try:
            item = await convex_client.query("agentRuns:getByRunId", {"runId": run_id})
            if item:
                return {
                    "run_id": run_id,
                    "agent_type": item.get("agentType"),
                    "mrn": item.get("mrn"),
                    "portal": item.get("portal"),
                    "status": "completed" if item.get("completedAt") else "started",
                    "started_at": item.get("startedAt"),
                    "completed_at": item.get("completedAt"),
                    "success": item.get("success"),
                    "error_message": item.get("errorMessage"),
                }
        except Exception:
            pass
    return None


async def wait_for_run(run_id: str) -> Optional[dict]:
    task = _running_tasks.get(run_id)
    if task:
        try:
            await asyncio.wait_for(asyncio.shield(task), timeout=AGENT_RUN_TIMEOUT + 30)
        except TimeoutError:
            state = _run_states.get(run_id)
            if state and _artifact_written_after_start(state):
                _log_step(
                    run_id,
                    "Timed out waiting for task callback, but fresh output artifact exists; marking completed",
                )
                await _complete_run(run_id, success=True)
            else:
                _log_step(
                    run_id,
                    "Timed out waiting for task completion and no fresh output artifact was found",
                )
                await _complete_run(
                    run_id,
                    success=False,
                    error="Timed out waiting for task completion",
                )
    return await get_run_status(run_id)


def _read_pa_required(mrn: str) -> bool:
    output_file = OUTPUT_DIR / f"eligibility_{mrn}.json"
    if not output_file.exists():
        return True
    with open(output_file) as f:
        data = json.load(f)
    return bool(data.get("pa_required", True))
