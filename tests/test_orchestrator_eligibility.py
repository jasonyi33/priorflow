import pytest

from server.services import orchestrator
from shared.models import AgentType, Portal


@pytest.mark.asyncio
async def test_run_eligibility_raises_when_agent_returns_empty(monkeypatch, tmp_path):
    run_id = "elig-test-empty"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.ELIGIBILITY.value,
        "mrn": "MRN-00421",
        "portal": "stedi",
        "status": "started",
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)

    async def fake_check(_mrn: str):
        return None

    async def fake_persist(_mrn: str, _prefix: str):
        return None

    monkeypatch.setattr("agents.eligibility_checker.check_eligibility_stedi", fake_check)
    monkeypatch.setattr(orchestrator, "_persist_output_file", fake_persist)

    with pytest.raises(RuntimeError, match="empty result"):
        await orchestrator._run_eligibility("MRN-00421", Portal.STEDI)


@pytest.mark.asyncio
async def test_run_eligibility_raises_when_output_missing(monkeypatch, tmp_path):
    run_id = "elig-test-no-output"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.ELIGIBILITY.value,
        "mrn": "MRN-00421",
        "portal": "stedi",
        "status": "started",
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)

    async def fake_check(_mrn: str):
        return {"ok": True}

    async def fake_persist(_mrn: str, _prefix: str):
        return None

    monkeypatch.setattr("agents.eligibility_checker.check_eligibility_stedi", fake_check)
    monkeypatch.setattr(orchestrator, "_persist_output_file", fake_persist)

    with pytest.raises(RuntimeError, match="output file was not created"):
        await orchestrator._run_eligibility("MRN-00421", Portal.STEDI)


@pytest.mark.asyncio
async def test_run_eligibility_succeeds_with_output(monkeypatch, tmp_path):
    run_id = "elig-test-success"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.ELIGIBILITY.value,
        "mrn": "MRN-00421",
        "portal": "stedi",
        "status": "started",
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)
    (tmp_path / "eligibility_MRN-00421.json").write_text("{}")

    async def fake_check(_mrn: str):
        return {"ok": True}

    persisted: dict[str, str] = {}

    async def fake_persist(mrn: str, prefix: str):
        persisted["mrn"] = mrn
        persisted["prefix"] = prefix

    monkeypatch.setattr("agents.eligibility_checker.check_eligibility_stedi", fake_check)
    monkeypatch.setattr(orchestrator, "_persist_output_file", fake_persist)

    await orchestrator._run_eligibility("MRN-00421", Portal.STEDI)
    assert persisted == {"mrn": "MRN-00421", "prefix": "eligibility"}
