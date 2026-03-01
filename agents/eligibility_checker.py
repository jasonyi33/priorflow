"""
Agent 1: Eligibility Checker.

Navigates Stedi (test mode) to verify patient coverage and
determine if prior authorization is required.

Owned by Dev 2.
"""

import os
from datetime import datetime, UTC

from browser_use_sdk import AsyncBrowserUse
from dotenv import load_dotenv

from agents.base import (
    load_chart,
    get_sensitive_data,
)
from shared.constants import (
    STEDI_URL,
    DEFAULT_MAX_STEPS_ELIGIBILITY,
)
from server.observability import initialize_laminar
from tools.db_client import save_eligibility_result
from tools.eligibility_parser import parse_stedi_response

try:
    from lmnr import Laminar, observe
except Exception:  # noqa: BLE001
    Laminar = None  # type: ignore[assignment]

    def observe(**_kwargs):  # type: ignore[no-redef]
        def _decorator(fn):
            return fn

        return _decorator

load_dotenv()

STEDI_LOGIN_URL = "https://portal.stedi.com/auth"
STEDI_PORTAL_URL = "https://portal.stedi.com/"


FAILURE_MARKERS = (
    "unable to complete",
    "unable to access",
    "could not access",
    "could not complete",
    "navigation failed",
    "invalid url",
    "security checkpoint",
    "bot protection",
)


def _build_task_prompt(mrn: str, chart: dict) -> str:
    patient = chart["patient"]
    insurance = chart["insurance"]
    return f"""
You are a healthcare eligibility verification assistant.

1. Open {STEDI_PORTAL_URL}.
2. If already authenticated via existing profile session, continue without logging in.
3. Only if login is required, use:
   - Email: x]stedi_email[x
   - Password: x]stedi_password[x
4. Ensure Test mode is ON.
5. Create a new eligibility check.
6. Select payer strictly based on the insurance plan/payer from chart: "{insurance['payer']}".
7. IMPORTANT: Do NOT override/fix remaining fields with custom chart values.
   Use Stedi's built-in Test mode sample/test-case values for subscriber/provider details.
8. Submit the eligibility check.
9. Extract and return a concise plain-text summary including:
   - coverage status (active/inactive)
   - copay
   - deductible / out-of-pocket
   - whether prior authorization is required and why

Use portal values shown on screen. Do not invent details.
Patient MRN: {mrn}
"""


@observe(
    name="agent.eligibility.run",
    span_type="TOOL",
    tags=["component:agent", "agent:eligibility", "portal:stedi"],
    ignore_input=True,
    ignore_output=True,
)
async def check_eligibility_stedi(mrn: str):
    """Use Browser Use Cloud SDK to check eligibility via Stedi."""
    initialize_laminar()
    if Laminar and Laminar.is_initialized():
        Laminar.set_trace_metadata(
            {
                "component": "agent",
                "agent_type": "eligibility",
                "portal": "stedi",
            }
        )

    if not os.getenv("BROWSER_USE_API_KEY"):
        raise RuntimeError("BROWSER_USE_API_KEY is not configured")

    sensitive = get_sensitive_data()
    if not sensitive.get("stedi_email") or not sensitive.get("stedi_password"):
        raise RuntimeError("STEDI_EMAIL/STEDI_PASSWORD are not configured")

    chart = load_chart(mrn)
    task_prompt = _build_task_prompt(mrn, chart)
    profile_id = os.getenv("BROWSER_USE_PROFILE_ID") or None
    llm = os.getenv("BROWSER_USE_LLM", "browser-use-2.0")
    client = AsyncBrowserUse(api_key=os.getenv("BROWSER_USE_API_KEY"))
    session_id: str | None = None

    try:
        session = await client.sessions.create_session(
            profile_id=profile_id,
            start_url=STEDI_PORTAL_URL,
            keep_alive=True,
        )
        session_id = str(session.id)
        print(f"🌐 Eligibility session: {session.id}")
        if hasattr(session, "live_url"):
            print(f"👁️  Live view: {session.live_url}")

        # Always provide explicit credentials for login fallback.
        # Keep profile session enabled to avoid MFA when cookies are valid.
        secrets: dict[str, str] = {
            "stedi_email": sensitive["stedi_email"],
            "stedi_password": sensitive["stedi_password"],
            "https://portal.stedi.com": f"{sensitive['stedi_email']}|||{sensitive['stedi_password']}",
            "https://*.stedi.com": f"{sensitive['stedi_email']}|||{sensitive['stedi_password']}",
        }

        task = await client.tasks.create_task(
            session_id=session_id,
            llm=llm,
            task=task_prompt,
            start_url=STEDI_PORTAL_URL,
            max_steps=DEFAULT_MAX_STEPS_ELIGIBILITY,
            vision=True,
            flash_mode=True,
            thinking=True,
            allowed_domains=["stedi.com", "portal.stedi.com"],
            secrets=secrets,
            metadata={
                "agent": "eligibility",
                "portal": "stedi",
                "mrn": mrn,
                "profile_id": profile_id or "",
            },
            system_prompt_extension=(
                "Prefer authenticated profile session; do not trigger MFA unless strictly required. "
                "Prefer on-screen values over assumptions. Return final summary as plain text, not JSON."
            ),
        )

        async for step in task.stream(interval=2):
            step_num = getattr(step, "number", "?")
            goal = getattr(step, "next_goal", getattr(step, "status", ""))
            url = getattr(step, "url", "")
            print(f"   📍 Step {step_num}: {goal} ({url})")

        result = await client.tasks.get_task(task.id)
        raw_summary = str(getattr(result, "output", "") or "").strip()
        status = str(getattr(result, "status", "") or "").lower()
        is_success = bool(getattr(result, "is_success", False))
        if not (is_success or (status in {"finished", "completed"} and raw_summary)):
            raise RuntimeError(f"Eligibility task failed with status: {status or 'unknown'}")

        if not raw_summary:
            raise RuntimeError("Eligibility task completed without output")
        lowered = raw_summary.lower()
        if any(marker in lowered for marker in FAILURE_MARKERS):
            raise RuntimeError(f"Eligibility agent reported portal failure: {raw_summary[:180]}")

        parsed = parse_stedi_response(mrn, raw_summary)
        await save_eligibility_result(parsed)
        return parsed.model_dump(mode="json")
    finally:
        if session_id:
            try:
                await client.sessions.update_session(session_id, action="stop")
            except Exception:
                pass
        try:
            await client.close()
        except Exception:
            pass
