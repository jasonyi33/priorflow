"""
Agent 3: Status Monitor.

Periodically checks PA status on CoverMyMeds,
detects status changes, and sends alerts via Agentmail.

Owned by Dev 2.
"""

import os
import re
from datetime import datetime, UTC

from browser_use_sdk import AsyncBrowserUse
from dotenv import load_dotenv

from agents.base import get_sensitive_data
from server.observability import initialize_laminar
from shared.constants import (
    COVERMYMEDS_URL,
    DEFAULT_MAX_STEPS_STATUS_MONITOR,
)
from shared.models import PAStatusUpdate, PAStatusEnum, Portal
from tools.alert_sender import (
    send_pa_alert,
    build_approval_alert,
    build_denial_alert,
    build_delay_alert,
)
from tools.db_client import save_status_update

try:
    from lmnr import Laminar, observe
except Exception:  # noqa: BLE001
    Laminar = None  # type: ignore[assignment]

    def observe(**_kwargs):  # type: ignore[no-redef]
        def _decorator(fn):
            return fn

        return _decorator

load_dotenv()

def _build_task_prompt(mrn: str, patient_name: str) -> str:
    return f"""
You are a PA status monitoring assistant.

1. Navigate to {COVERMYMEDS_URL} and log in with:
   - username: x]cmm_username[x
   - password: x]cmm_password[x
2. On the dashboard, find the PA request for patient {patient_name} ({mrn}).
3. Open that request and capture:
   - Current status (Pending / Approved / Denied / More Info Needed / Submitted)
   - Date submitted or determination date if shown
   - Any payer notes or denial reason
4. Return ONLY a concise plain-text summary with those fields.

Use values shown on-screen and do not invent information.
"""


def _extract_status(summary: str) -> PAStatusEnum:
    lower = summary.lower()
    if "approved" in lower or "approval" in lower:
        return PAStatusEnum.APPROVED
    if "denied" in lower or "denial" in lower:
        return PAStatusEnum.DENIED
    if "more info needed" in lower or "additional info" in lower:
        return PAStatusEnum.MORE_INFO_NEEDED
    if "submitted" in lower:
        return PAStatusEnum.SUBMITTED
    return PAStatusEnum.PENDING


def _extract_delay_days(summary: str) -> int | None:
    match = re.search(r"(\d+)\s+day", summary, re.IGNORECASE)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


async def _emit_alert_if_needed(
    patient_name: str,
    mrn: str,
    status: PAStatusEnum,
    summary: str,
) -> None:
    details = summary[:500]
    if status == PAStatusEnum.APPROVED:
        payload = build_approval_alert(patient_name, mrn, Portal.COVERMYMEDS, details)
        await send_pa_alert(payload)
        return
    if status == PAStatusEnum.DENIED:
        payload = build_denial_alert(patient_name, mrn, Portal.COVERMYMEDS, details)
        await send_pa_alert(payload)
        return
    if status == PAStatusEnum.PENDING:
        days = _extract_delay_days(summary)
        if days and days > 3:
            payload = build_delay_alert(patient_name, mrn, Portal.COVERMYMEDS, days)
            await send_pa_alert(payload)


@observe(
    name="agent.status_monitor.run",
    span_type="TOOL",
    tags=["component:agent", "agent:status_monitor", "portal:covermymeds"],
    ignore_input=True,
    ignore_output=True,
)
async def monitor_covermymeds(mrn: str, patient_name: str):
    """Check CoverMyMeds dashboard for PA determination status via SDK."""
    initialize_laminar()
    if Laminar and Laminar.is_initialized():
        Laminar.set_trace_metadata(
            {
                "component": "agent",
                "agent_type": "status_monitor",
                "portal": "covermymeds",
            }
        )

    api_key = os.getenv("BROWSER_USE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("BROWSER_USE_API_KEY is not configured")

    sensitive = get_sensitive_data()
    if not sensitive.get("cmm_username") or not sensitive.get("cmm_password"):
        raise RuntimeError("CMM_USERNAME/CMM_PASSWORD are not configured")

    profile_id = os.getenv("BROWSER_USE_PROFILE_ID") or None
    llm = os.getenv("BROWSER_USE_LLM", "browser-use-2.0")
    task_prompt = _build_task_prompt(mrn, patient_name)
    client = AsyncBrowserUse(api_key=api_key)
    session_id: str | None = None

    try:
        session = await client.sessions.create_session(
            profile_id=profile_id,
            start_url=COVERMYMEDS_URL,
            keep_alive=True,
        )
        session_id = str(session.id)
        print(f"🌐 Status session: {session.id}")
        if hasattr(session, "live_url"):
            print(f"👁️  Live view: {session.live_url}")

        task = await client.tasks.create_task(
            session_id=session_id,
            llm=llm,
            task=task_prompt,
            start_url=COVERMYMEDS_URL,
            max_steps=DEFAULT_MAX_STEPS_STATUS_MONITOR,
            vision=True,
            flash_mode=True,
            thinking=True,
            allowed_domains=["covermymeds.com", "covermymeds.health"],
            secrets={
                "https://*.covermymeds.com": sensitive["cmm_username"],
                "https://*.covermymeds.health": sensitive["cmm_password"],
                "https://oidc.covermymeds.com": f"{sensitive['cmm_username']}|||{sensitive['cmm_password']}",
            },
            metadata={"agent": "status_monitor", "portal": "covermymeds", "mrn": mrn},
            system_prompt_extension=(
                "Finish with a plain-text summary only. "
                "Do not return JSON or markdown."
            ),
        )

        async for step in task.stream(interval=2):
            step_num = getattr(step, "number", "?")
            goal = getattr(step, "next_goal", getattr(step, "status", ""))
            url = getattr(step, "url", "")
            print(f"   📍 Step {step_num}: {goal} ({url})")

        result = await client.tasks.get_task(task.id)
        summary = str(getattr(result, "output", "") or "").strip()
        status = str(getattr(result, "status", "") or "").lower()
        is_success = bool(getattr(result, "is_success", False))
        if not (is_success or (status in {"finished", "completed"} and summary)):
            raise RuntimeError(f"Status monitor task failed with status: {status or 'unknown'}")

        if not summary:
            raise RuntimeError("Status monitor task completed without output")

        status_enum = _extract_status(summary)
        update = PAStatusUpdate(
            request_id=f"pa-{mrn}",
            mrn=mrn,
            portal=Portal.COVERMYMEDS,
            status=status_enum,
            notes=summary[:1000],
            checked_at=datetime.now(UTC),
        )
        await save_status_update(update)
        await _emit_alert_if_needed(patient_name, mrn, status_enum, summary)
        return update.model_dump(mode="json")
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
