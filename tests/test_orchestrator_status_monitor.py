import pytest

from server.services import orchestrator
from shared.models import AgentType, Portal


@pytest.mark.asyncio
async def test_run_status_check_raises_when_monitor_returns_empty(monkeypatch, tmp_path):
    run_id = "status-test-empty"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.STATUS_MONITOR.value,
        "mrn": "MRN-00421",
        "portal": "covermymeds",
        "status": "started",
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(orchestrator, "ENABLE_AGENT_EXECUTION", True)

    async def fake_monitor(_mrn: str, _patient_name: str):
        return None

    async def fake_persist(_mrn: str, _prefix: str):
        return None

    monkeypatch.setattr("agents.status_monitor.monitor_covermymeds", fake_monitor)
    monkeypatch.setattr(orchestrator, "_persist_output_file", fake_persist)

    with pytest.raises(RuntimeError, match="returned empty result"):
        await orchestrator._run_status_check("MRN-00421", Portal.COVERMYMEDS)


@pytest.mark.asyncio
async def test_run_status_check_raises_when_output_missing(monkeypatch, tmp_path):
    run_id = "status-test-no-output"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.STATUS_MONITOR.value,
        "mrn": "MRN-00421",
        "portal": "covermymeds",
        "status": "started",
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(orchestrator, "ENABLE_AGENT_EXECUTION", True)

    async def fake_monitor(_mrn: str, _patient_name: str):
        return {"ok": True}

    async def fake_persist(_mrn: str, _prefix: str):
        return None

    monkeypatch.setattr("agents.status_monitor.monitor_covermymeds", fake_monitor)
    monkeypatch.setattr(orchestrator, "_persist_output_file", fake_persist)

    with pytest.raises(RuntimeError, match="output file was not created"):
        await orchestrator._run_status_check("MRN-00421", Portal.COVERMYMEDS)


@pytest.mark.asyncio
async def test_run_status_check_succeeds_with_output(monkeypatch, tmp_path):
    run_id = "status-test-success"
    orchestrator._run_states[run_id] = {
        "run_id": run_id,
        "agent_type": AgentType.STATUS_MONITOR.value,
        "mrn": "MRN-00421",
        "portal": "covermymeds",
        "status": "started",
        "logs": [],
    }
    monkeypatch.setattr(orchestrator, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(orchestrator, "ENABLE_AGENT_EXECUTION", True)
    (tmp_path / "status_MRN-00421.json").write_text("{}")

    async def fake_monitor(_mrn: str, _patient_name: str):
        return {"ok": True}

    persisted: dict[str, str] = {}

    async def fake_persist(mrn: str, prefix: str):
        persisted["mrn"] = mrn
        persisted["prefix"] = prefix

    monkeypatch.setattr("agents.status_monitor.monitor_covermymeds", fake_monitor)
    monkeypatch.setattr(orchestrator, "_persist_output_file", fake_persist)

    await orchestrator._run_status_check("MRN-00421", Portal.COVERMYMEDS)
    assert persisted == {"mrn": "MRN-00421", "prefix": "status"}
