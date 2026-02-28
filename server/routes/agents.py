"""
Agent run endpoints — Convex-first with fixture fallback.
"""

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter

from server.services.convex_client import convex_client

router = APIRouter()

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"


@router.get("/runs")
async def list_agent_runs(
    mrn: Optional[str] = None,
    type: Optional[str] = None,
) -> list[dict]:
    if convex_client.enabled:
        try:
            data = await convex_client.query("agentRuns:list")
            if mrn:
                data = [d for d in data if d.get("mrn") == mrn]
            if type:
                data = [d for d in data if d.get("agentType") == type or d.get("agent_type") == type]
            if data:
                return data
        except Exception:
            pass

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
