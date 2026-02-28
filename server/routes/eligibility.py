"""
Eligibility endpoints — trigger eligibility checks and retrieve results.

STUB: Returns fixture data. Dev 1 replaces with agent dispatch + Convex in Phase 1-2.
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from shared.models import TriggerEligibilityRequest, APIResponse

router = APIRouter()

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"


@router.post("/check")
async def trigger_eligibility_check(req: TriggerEligibilityRequest) -> APIResponse:
    """Trigger Agent 1 to run an eligibility check.

    STUB: In production, this dispatches an async background task
    that runs the eligibility agent and writes results to Convex.
    """
    # TODO: Dev 1 — Replace with orchestrator.dispatch_eligibility(req.mrn, req.portal)
    return APIResponse(
        success=True,
        message=f"Eligibility check queued for {req.mrn} on {req.portal.value}",
        data={"run_id": "stub-run-001", "mrn": req.mrn},
    )


@router.get("/{mrn}")
async def get_eligibility(mrn: str) -> list[dict]:
    """Get eligibility results for a patient.

    STUB: Returns fixture data or agent output if available.
    """
    # Check for real agent output first
    output_file = OUTPUT_DIR / f"eligibility_{mrn}.json"
    if output_file.exists():
        with open(output_file) as f:
            return [json.load(f)]

    # Fall back to fixture data for the demo patient
    if mrn == "MRN-00421":
        fixture_file = FIXTURES_DIR / "eligibility_sample.json"
        if fixture_file.exists():
            with open(fixture_file) as f:
                return [json.load(f)]

    return []
