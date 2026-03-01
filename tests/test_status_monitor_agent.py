import pytest

import agents.status_monitor as status_monitor
from shared.models import PAStatusEnum


def test_extract_status_mapping():
    assert status_monitor._extract_status("Request approved by payer") == PAStatusEnum.APPROVED
    assert status_monitor._extract_status("Final denial received") == PAStatusEnum.DENIED
    assert status_monitor._extract_status("More info needed from provider") == PAStatusEnum.MORE_INFO_NEEDED
    assert status_monitor._extract_status("Submitted to plan") == PAStatusEnum.SUBMITTED
    assert status_monitor._extract_status("Still in review") == PAStatusEnum.PENDING


def test_extract_delay_days():
    assert status_monitor._extract_delay_days("Pending for 6 days") == 6
    assert status_monitor._extract_delay_days("No delay info") is None


@pytest.mark.asyncio
async def test_monitor_covermymeds_requires_api_key(monkeypatch):
    monkeypatch.delenv("BROWSER_USE_API_KEY", raising=False)
    monkeypatch.setattr(
        status_monitor,
        "get_sensitive_data",
        lambda: {"cmm_username": "user", "cmm_password": "pass"},
    )
    with pytest.raises(RuntimeError, match="BROWSER_USE_API_KEY"):
        await status_monitor.monitor_covermymeds("MRN-00421", "Jane Doe")


@pytest.mark.asyncio
async def test_monitor_covermymeds_saves_status(monkeypatch):
    monkeypatch.setenv("BROWSER_USE_API_KEY", "test-key")
    monkeypatch.setenv("BROWSER_USE_LLM", "browser-use-2.0")
    monkeypatch.setattr(
        status_monitor,
        "get_sensitive_data",
        lambda: {"cmm_username": "user", "cmm_password": "pass"},
    )

    saved: dict[str, str] = {}
    alerts: list[str] = []

    async def fake_save(update):
        saved["mrn"] = update.mrn
        saved["status"] = update.status.value
        return True

    async def fake_alert(_payload):
        alerts.append("sent")
        return True

    class FakeTask:
        id = "task-1"

        async def stream(self, interval=2):
            if False:
                yield interval

    class FakeTasks:
        async def create_task(self, **_kwargs):
            return FakeTask()

        async def get_task(self, _task_id):
            class Result:
                is_success = False
                status = "finished"
                output = "PA approved. determination completed."

            return Result()

    class FakeSessions:
        async def create_session(self, **_kwargs):
            class Session:
                id = "sess-1"
                live_url = "https://live.example"

            return Session()

        async def update_session(self, _session_id, action="stop"):
            return {"ok": True, "action": action}

    class FakeClient:
        def __init__(self, api_key=None):
            self.api_key = api_key
            self.tasks = FakeTasks()
            self.sessions = FakeSessions()

        async def close(self):
            return None

    monkeypatch.setattr(status_monitor, "AsyncBrowserUse", FakeClient)
    monkeypatch.setattr(status_monitor, "save_status_update", fake_save)
    monkeypatch.setattr(status_monitor, "send_pa_alert", fake_alert)

    result = await status_monitor.monitor_covermymeds("MRN-00421", "Jane Doe")

    assert saved["mrn"] == "MRN-00421"
    assert saved["status"] == PAStatusEnum.APPROVED.value
    assert result["status"] == PAStatusEnum.APPROVED.value
    assert alerts == ["sent"]
