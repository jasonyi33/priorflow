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
from datetime import datetime
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

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("output")
FIXTURES_DIR = Path("data/fixtures")
CHARTS_DIR = Path("data/charts")
# Default off for local/test stability. Real agent execution can be enabled explicitly.
ENABLE_AGENT_EXECUTION = os.getenv("ENABLE_AGENT_EXECUTION", "false").lower() == "true"


async def dispatch_eligibility(mrn: str, portal: Portal = Portal.STEDI) -> str:
    run_id = f"elig-{mrn}-{int(datetime.utcnow().timestamp())}"
    convex_doc_id = await _start_run(run_id, AgentType.ELIGIBILITY, mrn, portal)
    task = asyncio.create_task(_run_with_retry(convex_doc_id, AgentType.ELIGIBILITY, mrn, portal, _run_eligibility))
    _running_tasks[run_id] = task
    return run_id


async def dispatch_pa_submission(mrn: str, portal: Portal = Portal.COVERMYMEDS) -> str:
    run_id = f"pa-{mrn}-{int(datetime.utcnow().timestamp())}"
    convex_doc_id = await _start_run(run_id, AgentType.PA_FORM_FILLER, mrn, portal)
    task = asyncio.create_task(_run_with_retry(convex_doc_id, AgentType.PA_FORM_FILLER, mrn, portal, _run_pa_submission))
    _running_tasks[run_id] = task
    return run_id


async def dispatch_status_check(mrn: str, portal: Optional[Portal] = None) -> str:
    run_id = f"status-{mrn}-{int(datetime.utcnow().timestamp())}"
    convex_doc_id = await _start_run(run_id, AgentType.STATUS_MONITOR, mrn, portal or Portal.COVERMYMEDS)
    task = asyncio.create_task(_run_with_retry(convex_doc_id, AgentType.STATUS_MONITOR, mrn, portal or Portal.COVERMYMEDS, _run_status_check))
    _running_tasks[run_id] = task
    return run_id


async def dispatch_full_flow(mrn: str) -> dict:
    """Run the full pipeline: eligibility -> PA submission -> status monitoring.

    """
    elig_run_id = await dispatch_eligibility(mrn)
    pa_run_id = await dispatch_pa_submission(mrn)
    status_run_id = await dispatch_status_check(mrn)

    return {
        "eligibility_run_id": elig_run_id,
        "pa_run_id": pa_run_id,
        "status_run_id": status_run_id,
    }


# ──────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────

_running_tasks: dict[str, asyncio.Task] = {}


async def _start_run(run_id: str, agent_type: AgentType, mrn: str, portal: Portal) -> Optional[str]:
    """Create an AgentRun record. Returns the Convex document _id if available."""
    run = AgentRun(
        id=run_id,
        agent_type=agent_type,
        mrn=mrn,
        portal=portal,
        started_at=datetime.utcnow(),
        steps_taken=0,
        max_steps=25 if agent_type == AgentType.ELIGIBILITY else 40,
    )
    return await _persist_run(run)


async def _run_with_retry(convex_doc_id: Optional[str], agent_type: AgentType, mrn: str, portal: Portal, fn: Callable[[str, Portal], Awaitable[None]]):
    attempt = 0
    while attempt < MAX_AGENT_RETRIES:
        try:
            await asyncio.wait_for(fn(mrn, portal), timeout=AGENT_RUN_TIMEOUT)
            await _complete_run(convex_doc_id, success=True)
            return
        except Exception as exc:  # noqa: BLE001
            attempt += 1
            if attempt >= MAX_AGENT_RETRIES:
                await _complete_run(convex_doc_id, success=False, error=str(exc))
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
        patient_name = _lookup_patient_name(mrn)
        await monitor_covermymeds(mrn, patient_name)
    else:
        await _write_fixture_output(mrn, "status")
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


async def _persist_run(run: AgentRun) -> Optional[str]:
    """Persist an AgentRun to Convex. Returns the Convex document _id, or None on failure."""
    if convex_client.enabled:
        try:
            doc_id = await convex_client.mutation(
                "agentRuns:create",
                {
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
            return doc_id
        except Exception:
            logger.warning("Failed to persist agent run to Convex", exc_info=True)
    return None


async def _complete_run(convex_doc_id: Optional[str], success: bool, error: Optional[str] = None):
    if not convex_doc_id or not convex_client.enabled:
        return
    try:
        await convex_client.mutation(
            "agentRuns:complete",
            {
                "id": convex_doc_id,
                "completedAt": int(datetime.utcnow().timestamp() * 1000),
                "stepsTaken": 0,
                "success": success,
                "errorMessage": error,
                "gifPath": None,
            },
        )
    except Exception:
        logger.warning("Failed to complete agent run in Convex", exc_info=True)


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
                checked_at=datetime.utcnow(),
            )
            await db_client.save_eligibility_result(result)
        except Exception:
            logger.warning("Failed to persist eligibility output for %s", mrn, exc_info=True)
    elif prefix == "pa_submission":
        path = f"output/pa_submission_{mrn}.json"
        try:
            with open(path) as f:
                data = json.load(f)
            now = datetime.utcnow()
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
                checked_at=datetime.utcnow(),
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
