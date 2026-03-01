"""
PA request endpoints — Convex-first with orchestrator dispatch.
"""

import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException

from shared.models import TriggerPARequest, TriggerStatusCheckRequest, APIResponse
from server.services.convex_client import convex_client
from server.services import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter()

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"


@router.post("/submit")
async def trigger_pa_submission(req: TriggerPARequest) -> APIResponse:
    run_id = await orchestrator.dispatch_pa_submission(req.mrn, req.portal)
    return APIResponse(
        success=True,
        message=f"PA submission queued for {req.mrn} on {req.portal.value}",
        data={"run_id": run_id, "mrn": req.mrn},
    )


@router.get("")
async def list_pa_requests(mrn: Optional[str] = None, status: Optional[str] = None) -> list[dict]:
    # Convex first
    if convex_client.enabled:
        try:
            if mrn:
                data = await convex_client.query("paRequests:getByMrn", {"mrn": mrn})
            elif status:
                data = await convex_client.query("paRequests:getByStatus", {"status": status})
            else:
                data = await convex_client.query("paRequests:list")
            if data:
                return data
        except Exception:
            logger.warning("Convex query failed for paRequests", exc_info=True)

    results = []
    seen_mrns: set[str] = set()

    # 1. In-memory PA results from orchestrator (most up-to-date)
    for pa_mrn, pa_data in orchestrator._pa_results.items():
        if mrn and pa_mrn != mrn:
            continue
        if status and pa_data.get("status") != status:
            continue
        seen_mrns.add(pa_mrn)
        results.append(pa_data)

    # 2. Scan output directory for pa_submission_*.json files
    for output_file in sorted(OUTPUT_DIR.glob("pa_submission_*.json"), reverse=True):
        try:
            with open(output_file) as f:
                data = json.load(f)
            file_mrn = data.get("mrn", "")
            if file_mrn in seen_mrns:
                continue
            seen_mrns.add(file_mrn)
            if mrn and file_mrn != mrn:
                continue
            if status and data.get("status") != status:
                continue
            results.append(data)
        except Exception:
            logger.warning("Failed to read %s", output_file, exc_info=True)

    # 3. Fixture fallback only if nothing found
    if not results:
        fixture_file = FIXTURES_DIR / "pa_submission_sample.json"
        if fixture_file.exists():
            with open(fixture_file) as f:
                data = json.load(f)
                if mrn and data.get("mrn") != mrn:
                    return []
                if status and data.get("status") != status:
                    return []
                results.append(data)

    return results


@router.get("/{request_id}")
async def get_pa_request(request_id: str) -> dict:
    if convex_client.enabled:
        try:
            all_requests = await convex_client.query("paRequests:list")
            for req in all_requests or []:
                if str(req.get("_id", "")) == request_id or req.get("id") == request_id:
                    return req
        except Exception:
            logger.warning("Convex query failed for paRequests:list", exc_info=True)

    fixture_file = FIXTURES_DIR / "pa_submission_sample.json"
    if fixture_file.exists():
        with open(fixture_file) as f:
            data = json.load(f)
            if data.get("id") == request_id:
                return data

    raise HTTPException(status_code=404, detail=f"PA request {request_id} not found")


@router.post("/status/check")
async def trigger_status_check(req: TriggerStatusCheckRequest) -> APIResponse:
    run_id = await orchestrator.dispatch_status_check(req.mrn, req.portal)
    return APIResponse(
        success=True,
        message=f"Status check queued for {req.mrn}",
        data={"run_id": run_id, "mrn": req.mrn},
    )


@router.get("/emails/{mrn}")
async def get_pa_emails(mrn: str) -> APIResponse:
    """Retrieve Agentmail email thread history for a PA case."""
    from tools.alert_sender import get_pa_email_history

    history = get_pa_email_history(mrn)
    return APIResponse(
        success=True,
        message=f"Email history for {mrn}",
        data={"emails": history, "count": len(history)},
    )
