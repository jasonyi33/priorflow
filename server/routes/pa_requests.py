"""
PA request endpoints — trigger PA submissions and retrieve status.

STUB: Returns fixture data. Dev 1 replaces with agent dispatch + Convex in Phase 1-2.
"""

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException

from shared.models import TriggerPARequest, TriggerStatusCheckRequest, APIResponse

router = APIRouter()

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"


@router.post("/submit")
async def trigger_pa_submission(req: TriggerPARequest) -> APIResponse:
    """Trigger Agent 2 to submit a PA request.

    STUB: In production, this dispatches an async background task
    that runs the PA form filler agent and writes results to Convex.
    """
    # TODO: Dev 1 — Replace with orchestrator.dispatch_pa_submission(req.mrn, req.portal)
    return APIResponse(
        success=True,
        message=f"PA submission queued for {req.mrn} on {req.portal.value}",
        data={"run_id": "stub-run-002", "mrn": req.mrn},
    )


@router.get("")
async def list_pa_requests(mrn: Optional[str] = None, status: Optional[str] = None) -> list[dict]:
    """List PA requests, optionally filtered by MRN and/or status.

    STUB: Returns fixture data or agent output if available.
    """
    results = []

    # Check for real agent output
    if mrn:
        output_file = OUTPUT_DIR / f"pa_submission_{mrn}.json"
        if output_file.exists():
            with open(output_file) as f:
                results.append(json.load(f))

    # Fall back to fixture
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
    """Get a single PA request by ID.

    STUB: Returns fixture data.
    """
    fixture_file = FIXTURES_DIR / "pa_submission_sample.json"
    if fixture_file.exists():
        with open(fixture_file) as f:
            data = json.load(f)
            if data.get("id") == request_id:
                return data

    raise HTTPException(status_code=404, detail=f"PA request {request_id} not found")


@router.post("/status/check")
async def trigger_status_check(req: TriggerStatusCheckRequest) -> APIResponse:
    """Trigger Agent 3 to check PA status across portals.

    STUB: In production, this dispatches the status monitor agent.
    """
    # TODO: Dev 1 — Replace with orchestrator.dispatch_status_check(req.mrn, req.portal)
    return APIResponse(
        success=True,
        message=f"Status check queued for {req.mrn}",
        data={"run_id": "stub-run-003", "mrn": req.mrn},
    )
