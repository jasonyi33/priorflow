"""
Agent run endpoints — view agent execution history.

STUB: Returns fixture data. Dev 1 replaces with Convex queries in Phase 1-2.
"""

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter

router = APIRouter()

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"


@router.get("/runs")
async def list_agent_runs(
    mrn: Optional[str] = None,
    type: Optional[str] = None,
) -> list[dict]:
    """List agent run history, optionally filtered by MRN and/or agent type.

    STUB: Returns fixture data.
    """
    fixture_file = FIXTURES_DIR / "agent_run_sample.json"
    if fixture_file.exists():
        with open(fixture_file) as f:
            data = json.load(f)
            if mrn and data.get("mrn") != mrn:
                return []
            if type and data.get("agent_type") != type:
                return []
            return [data]
    return []
