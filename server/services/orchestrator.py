"""
Agent orchestration service.

Dispatches Browser Use agents as async background tasks,
tracks their runs, and chains eligibility -> PA -> status flows.

Owned by Dev 1. Skeleton for Phase 1-2 implementation.
"""

import asyncio
import json
import os
from datetime import datetime, UTC
from pathlib import Path
from typing import Optional, Callable, Awaitable

from shared.models import AgentType, Portal, AgentRun, EligibilityResult, PARequest, PAStatusUpdate
from server.services.convex_client import convex_client
from tools import db_client
from shared.constants import (
    MAX_AGENT_RETRIES,
    RETRY_BACKOFF_BASE,
    AGENT_RUN_TIMEOUT,
)

OUTPUT_DIR = Path("output")
FIXTURES_DIR = Path("data/fixtures")
# Default off for local/test stability. Real agent execution can be enabled explicitly.
ENABLE_AGENT_EXECUTION = os.getenv("ENABLE_AGENT_EXECUTION", "false").lower() == "true"
RUN_MAX_STEPS = {
    AgentType.ELIGIBILITY: 25,
    AgentType.PA_FORM_FILLER: 40,
    AgentType.STATUS_MONITOR: 15,
}


async def dispatch_eligibility(mrn: str, portal: Portal = Portal.STEDI) -> str:
    run_id = f"elig-{mrn}-{int(datetime.now(UTC).timestamp())}"
    await _start_run(run_id, AgentType.ELIGIBILITY, mrn, portal)
    task = asyncio.create_task(_run_with_retry(run_id, AgentType.ELIGIBILITY, mrn, portal, _run_eligibility))
    _running_tasks[run_id] = task
    return run_id


async def dispatch_pa_submission(mrn: str, portal: Portal = Portal.COVERMYMEDS) -> str:
    run_id = f"pa-{mrn}-{int(datetime.now(UTC).timestamp())}"
    await _start_run(run_id, AgentType.PA_FORM_FILLER, mrn, portal)
    task = asyncio.create_task(_run_with_retry(run_id, AgentType.PA_FORM_FILLER, mrn, portal, _run_pa_submission))
    _running_tasks[run_id] = task
    return run_id


async def dispatch_status_check(mrn: str, portal: Optional[Portal] = None) -> str:
    run_id = f"status-{mrn}-{int(datetime.now(UTC).timestamp())}"
    await _start_run(run_id, AgentType.STATUS_MONITOR, mrn, portal or Portal.COVERMYMEDS)
    task = asyncio.create_task(_run_with_retry(run_id, AgentType.STATUS_MONITOR, mrn, portal or Portal.COVERMYMEDS, _run_status_check))
    _running_tasks[run_id] = task
    return run_id


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
        "started_at": run.started_at.isoformat(),
        "completed_at": None,
        "success": None,
        "error_message": None,
    }
    await _persist_run(run)


async def _run_with_retry(run_id: str, agent_type: AgentType, mrn: str, portal: Portal, fn: Callable[[str, Portal], Awaitable[None]]):
    attempt = 0
    while attempt < MAX_AGENT_RETRIES:
        try:
            await asyncio.wait_for(fn(mrn, portal), timeout=AGENT_RUN_TIMEOUT)
            await _complete_run(run_id, success=True)
            return
        except Exception as exc:  # noqa: BLE001
            attempt += 1
            _run_states[run_id]["status"] = "retrying"
            if attempt >= MAX_AGENT_RETRIES:
                await _complete_run(run_id, success=False, error=str(exc))
                return
            await asyncio.sleep(RETRY_BACKOFF_BASE * attempt)


async def _run_eligibility(mrn: str, portal: Portal):
    if ENABLE_AGENT_EXECUTION:
        from agents.eligibility_checker import check_eligibility_stedi
        await check_eligibility_stedi(mrn)
    else:
        await _write_fixture_output(mrn, "eligibility")
    await _persist_output_file(mrn, "eligibility")


async def _run_pa_submission(mrn: str, portal: Portal):
    if ENABLE_AGENT_EXECUTION:
        from agents.pa_form_filler import fill_covermymeds_pa
        await fill_covermymeds_pa(mrn)
    else:
        await _write_fixture_output(mrn, "pa_submission")
    await _persist_output_file(mrn, "pa_submission")


async def _run_status_check(mrn: str, portal: Portal):
    if ENABLE_AGENT_EXECUTION:
        from agents.status_monitor import monitor_covermymeds
        await monitor_covermymeds(mrn, mrn)
    else:
        await _write_fixture_output(mrn, "status")
    await _persist_output_file(mrn, "status")


async def _persist_run(run: AgentRun):
    if convex_client.enabled:
        try:
            doc_id = await convex_client.mutation(
                "agentRuns:create",
                {
                    "runId": run.id,
                    "agentType": run.agent_type.value,
                    "mrn": run.mrn,
                    "portal": run.portal.value,
                    "startedAt": int(run.started_at.timestamp() * 1000),
                    "completedAt": None,
                    "stepsTaken": run.steps_taken,
                    "maxSteps": run.max_steps,
                    "success": None,
                    "errorMessage": None,
                    "gifPath": run.gif_path,
                },
            )
            if doc_id:
                _convex_run_doc_ids[run.id] = str(doc_id)
            return
        except Exception:
            pass
    # Fallback: nothing to do (runs tracked in memory only)


async def _complete_run(run_id: str, success: bool, error: Optional[str] = None):
    completed_at = datetime.now(UTC)
    state = _run_states.get(run_id)
    if state:
        state["status"] = "completed" if success else "failed"
        state["completed_at"] = completed_at.isoformat()
        state["success"] = success
        state["error_message"] = error

    if convex_client.enabled:
        try:
            convex_doc_id = _convex_run_doc_ids.get(run_id)
            if not convex_doc_id:
                return
            await convex_client.mutation(
                "agentRuns:complete",
                {
                    "id": convex_doc_id,
                    "completedAt": int(completed_at.timestamp() * 1000),
                    "stepsTaken": 0,
                    "success": success,
                    "errorMessage": error,
                    "gifPath": None,
                },
            )
            return
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
            pass
    elif prefix == "pa_submission":
        path = f"output/pa_submission_{mrn}.json"
        try:
            with open(path) as f:
                data = json.load(f)
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
            pass
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
            pass


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
            if task.done() and state["status"] == "started":
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
        await task
    return await get_run_status(run_id)


def _read_pa_required(mrn: str) -> bool:
    output_file = OUTPUT_DIR / f"eligibility_{mrn}.json"
    if not output_file.exists():
        return True
    with open(output_file) as f:
        data = json.load(f)
    return bool(data.get("pa_required", True))
