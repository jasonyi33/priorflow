"""
Agent run endpoints — Convex-first with fixture fallback.
"""

import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException

from server.services.convex_client import convex_client
from server.services import orchestrator

logger = logging.getLogger(__name__)

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
            logger.warning("Convex query failed for agentRuns:list", exc_info=True)

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


@router.get("/runs/{run_id}")
async def get_agent_run(run_id: str) -> dict:
    """Poll a specific run by API run_id."""
    status = await orchestrator.get_run_status(run_id)
    if status:
        return status

    if convex_client.enabled:
        try:
            item = await convex_client.query("agentRuns:getByRunId", {"runId": run_id})
            if item:
                return item
        except Exception:
            pass

    raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
