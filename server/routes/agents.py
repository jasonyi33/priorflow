"""
Agent run endpoints — Convex-first with fixture fallback.
"""

import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

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
    results: list[dict] = []

    # 1. In-memory runs from orchestrator (current server process)
    for state in orchestrator._run_states.values():
        run = dict(state)
        task = orchestrator._running_tasks.get(run["run_id"])
        if task is not None and task.done() and run["status"] == "started":
            exc = task.exception() if not task.cancelled() else None
            run["status"] = "failed" if exc else "completed"
            if exc:
                run["error_message"] = str(exc)
        results.append(run)

    # 2. Convex (may have runs from previous server processes)
    if convex_client.enabled:
        try:
            convex_data = await convex_client.query("agentRuns:list")
            in_memory_ids = {r["run_id"] for r in results}
            for d in convex_data or []:
                rid = d.get("runId") or d.get("run_id") or d.get("id", "")
                if rid not in in_memory_ids:
                    results.append(d)
        except Exception:
            logger.warning("Convex query failed for agentRuns:list", exc_info=True)

    # 3. Fixture fallback only in local demo mode.
    if not results and not convex_client.enabled:
        fixture_file = FIXTURES_DIR / "agent_run_sample.json"
        if fixture_file.exists():
            with open(fixture_file) as f:
                data = json.load(f)
                results.append(data)

    # Apply filters
    if mrn:
        results = [r for r in results if r.get("mrn") == mrn]
    if type:
        results = [r for r in results if r.get("agentType") == type or r.get("agent_type") == type]

    return results


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


OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"


@router.get("/gif/{filename}")
async def download_agent_gif(filename: str):
    """Serve a recorded agent GIF for download."""
    if not filename.endswith(".gif"):
        raise HTTPException(status_code=400, detail="Only .gif files supported")
    # Prevent path traversal
    safe_name = Path(filename).name
    gif_path = OUTPUT_DIR / safe_name
    if not gif_path.exists():
        raise HTTPException(status_code=404, detail=f"GIF {safe_name} not found")
    return FileResponse(gif_path, media_type="image/gif", filename=safe_name)
