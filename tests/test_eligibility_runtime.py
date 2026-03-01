import pytest

import agents.eligibility_checker as eligibility_checker


@pytest.mark.asyncio
async def test_eligibility_accepts_finished_status_with_output(monkeypatch):
    monkeypatch.setenv("BROWSER_USE_API_KEY", "test-key")
    monkeypatch.setenv("BROWSER_USE_LLM", "browser-use-2.0")
    monkeypatch.setattr(
        eligibility_checker,
        "get_sensitive_data",
        lambda: {"stedi_email": "user@example.com", "stedi_password": "pass"},
    )
    monkeypatch.setattr(
        eligibility_checker,
        "load_chart",
        lambda _mrn: {
            "patient": {"first_name": "Jane", "last_name": "Doe", "dob": "1990-01-01"},
            "insurance": {"payer": "Aetna", "member_id": "A123"},
            "provider": {"name": "Dr. Smith", "npi": "1234567890"},
        },
    )

    class Parsed:
        def model_dump(self, mode="json"):
            return {"mrn": "MRN-00421", "coverage_active": True, "mode": mode}

    monkeypatch.setattr(eligibility_checker, "parse_stedi_response", lambda _mrn, _raw: Parsed())

    saved = {"ok": False}

    async def fake_save(_parsed):
        saved["ok"] = True
        return True

    monkeypatch.setattr(eligibility_checker, "save_eligibility_result", fake_save)

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
                output = "Coverage active. PA required."

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

    monkeypatch.setattr(eligibility_checker, "AsyncBrowserUse", FakeClient)

    result = await eligibility_checker.check_eligibility_stedi("MRN-00421")
    assert saved["ok"] is True
    assert result["mrn"] == "MRN-00421"


@pytest.mark.asyncio
async def test_eligibility_raises_on_portal_failure_summary(monkeypatch):
    monkeypatch.setenv("BROWSER_USE_API_KEY", "test-key")
    monkeypatch.setenv("BROWSER_USE_LLM", "browser-use-2.0")
    monkeypatch.setattr(
        eligibility_checker,
        "get_sensitive_data",
        lambda: {"stedi_email": "user@example.com", "stedi_password": "pass"},
    )
    monkeypatch.setattr(
        eligibility_checker,
        "load_chart",
        lambda _mrn: {
            "patient": {"first_name": "Jane", "last_name": "Doe", "dob": "1990-01-01"},
            "insurance": {"payer": "Aetna", "member_id": "A123"},
            "provider": {"name": "Dr. Smith", "npi": "1234567890"},
        },
    )

    async def fake_save(_parsed):
        return True

    monkeypatch.setattr(eligibility_checker, "save_eligibility_result", fake_save)

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
                output = "Unable to complete because navigation failed with invalid URL."

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

    monkeypatch.setattr(eligibility_checker, "AsyncBrowserUse", FakeClient)

    with pytest.raises(RuntimeError, match="portal failure"):
        await eligibility_checker.check_eligibility_stedi("MRN-00421")
