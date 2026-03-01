import asyncio
from datetime import datetime, UTC

import pytest

from server.services import orchestrator
from shared.models import AgentType


@pytest.mark.asyncio
async def test_get_run_status_marks_retrying_done_task_completed():
    run_id = "wait-retrying-done"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.ELIGIBILITY.value,
        "mrn": "MRN-00421",
        "portal": "stedi",
        "status": "retrying",
        "started_at": datetime.now(UTC).isoformat(),
        "logs": [],
    }

    async def _ok():
        return None

    task = asyncio.create_task(_ok())
    await task
    orchestrator._running_tasks[run_id] = task

    status = await orchestrator.get_run_status(run_id)
    assert status is not None
    assert status["status"] == "completed"
    assert status["task_done"] is True


@pytest.mark.asyncio
async def test_wait_for_run_marks_completed_when_fresh_artifact_exists(monkeypatch, tmp_path):
    run_id = "wait-timeout-with-artifact"
    mrn = "MRN-ARTIFACT"
    started_at = datetime.now(UTC).isoformat()
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.ELIGIBILITY.value,
        "mrn": mrn,
        "portal": "stedi",
        "status": "started",
        "started_at": started_at,
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(orchestrator, "AGENT_RUN_TIMEOUT", 0)

    (tmp_path / f"eligibility_{mrn}.json").write_text("{}")

    async def _never():
        await asyncio.sleep(60)

    task = asyncio.create_task(_never())
    orchestrator._running_tasks[run_id] = task
    try:
        status = await orchestrator.wait_for_run(run_id)
        assert status is not None
        assert status["status"] == "completed"
        assert status["success"] is True
    finally:
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

