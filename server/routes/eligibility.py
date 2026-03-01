"""
Eligibility endpoints — Convex-first with orchestrator dispatch.

Dispatches Agent 1 via orchestrator and stores results in Convex when available.
Falls back to local output/fixtures for demo.
"""

import json
import logging
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException

from shared.models import TriggerEligibilityRequest, APIResponse
from server.services.convex_client import convex_client
from server.services import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter()

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"


@router.get("")
async def list_eligibility() -> list[dict]:
    # Convex-first in deployed mode.
    if convex_client.enabled:
        try:
            return await convex_client.query("eligibilityChecks:list")
        except Exception:
            logger.warning("Convex query failed for eligibilityChecks:list", exc_info=True)
            return []

    # Local fallback for dev/demo mode.
    results: list[dict] = []
    for output_file in sorted(OUTPUT_DIR.glob("eligibility_*.json"), reverse=True):
        try:
            with open(output_file) as f:
                results.append(json.load(f))
        except Exception:
            logger.warning("Failed to read %s", output_file, exc_info=True)

    if results:
        return results

    fixture_file = FIXTURES_DIR / "eligibility_sample.json"
    if fixture_file.exists():
        with open(fixture_file) as f:
            return [json.load(f)]
    return []


@router.post("/check")
async def trigger_eligibility_check(req: TriggerEligibilityRequest) -> APIResponse:
    missing = [
        key
        for key in ("BROWSER_USE_API_KEY", "STEDI_EMAIL", "STEDI_PASSWORD")
        if not os.getenv(key, "").strip()
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required environment variables for live eligibility: {', '.join(missing)}",
        )

    run_id = await orchestrator.dispatch_eligibility(req.mrn, req.portal)
    return APIResponse(
        success=True,
        message=f"Eligibility check queued for {req.mrn} on {req.portal.value}",
        data={"run_id": run_id, "mrn": req.mrn},
    )


@router.get("/{mrn}")
async def get_eligibility(mrn: str) -> list[dict]:
    # Try Convex first
    if convex_client.enabled:
        try:
            data = await convex_client.query("eligibilityChecks:getByMrn", {"mrn": mrn})
            if data:
                return data
        except Exception:
            logger.warning("Convex query failed for eligibilityChecks:getByMrn", exc_info=True)
            # In deployed/live mode, avoid mixing in local fixtures when Convex is configured.
            return []

    # Check for agent output file
    output_file = OUTPUT_DIR / f"eligibility_{mrn}.json"
    if output_file.exists():
        with open(output_file) as f:
            return [json.load(f)]

    # Fall back to fixture only when Convex is not configured (local demo mode).
    if not convex_client.enabled and mrn == "MRN-00421":
        fixture_file = FIXTURES_DIR / "eligibility_sample.json"
        if fixture_file.exists():
            with open(fixture_file) as f:
                return [json.load(f)]

    return []
