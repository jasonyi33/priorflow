"""
Agent 3: Status Monitor.

Periodically checks PA status across CoverMyMeds and Claim.MD,
detects status changes, and sends alerts via Agentmail.

Owned by Dev 2.
"""

from browser_use import Agent, Browser, ChatBrowserUse, Tools, ActionResult
from dotenv import load_dotenv

from agents.base import get_sensitive_data
from shared.constants import (
    COVERMYMEDS_URL,
    CLAIMMD_URL,
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
from datetime import datetime, UTC

load_dotenv()

tools = Tools()


@tools.action("Send alert email about PA status change")
async def send_alert(
    patient_name: str, status: str, portal: str, details: str
) -> ActionResult:
    """Send alert via alert_sender module."""
    from shared.models import Portal as PortalEnum

    portal_map = {
        "covermymeds": PortalEnum.COVERMYMEDS,
        "claimmd": PortalEnum.CLAIMMD,
        "stedi": PortalEnum.STEDI,
    }
    portal_enum = portal_map.get(
        portal.lower(), PortalEnum.COVERMYMEDS
    )

    status_lower = status.lower()
    if "approv" in status_lower:
        payload = build_approval_alert(
            patient_name, "", portal_enum, details
        )
    elif "denied" in status_lower or "deni" in status_lower:
        payload = build_denial_alert(
            patient_name, "", portal_enum, details
        )
    else:
        payload = build_delay_alert(
            patient_name, "", portal_enum, 0
        )

    await send_pa_alert(payload)
    return ActionResult(
        extracted_content=(
            f"Alert sent: {patient_name} — {status} on {portal}"
        ),
    )


@tools.action("Update PA status in database")
async def update_status(
    mrn: str, status: str, portal: str
) -> ActionResult:
    status_map = {
        "pending": PAStatusEnum.PENDING,
        "approved": PAStatusEnum.APPROVED,
        "denied": PAStatusEnum.DENIED,
        "more info needed": PAStatusEnum.MORE_INFO_NEEDED,
        "more_info_needed": PAStatusEnum.MORE_INFO_NEEDED,
        "submitted": PAStatusEnum.SUBMITTED,
    }
    portal_map = {
        "covermymeds": Portal.COVERMYMEDS,
        "claimmd": Portal.CLAIMMD,
    }

    status_enum = status_map.get(
        status.lower(), PAStatusEnum.PENDING
    )
    portal_enum = portal_map.get(
        portal.lower(), Portal.COVERMYMEDS
    )

    update = PAStatusUpdate(
        request_id=f"pa-{mrn}",
        mrn=mrn,
        portal=portal_enum,
        status=status_enum,
        notes=status,
        checked_at=datetime.now(UTC),
    )
    await save_status_update(update)
    return ActionResult(
        extracted_content=f"Status updated: {mrn} -> {status}"
    )


async def monitor_covermymeds(mrn: str, patient_name: str):
    """Check CoverMyMeds dashboard for PA determination status."""
    browser = Browser(headless=True)

    agent = Agent(
        task=f"""
        You are a PA status monitoring assistant.

        1. Navigate to {COVERMYMEDS_URL} and log in
           (username: x]cmm_username[x,
            password: x]cmm_password[x).
        2. On the dashboard, find the PA request for
           patient {patient_name}.
        3. Check the current status of the PA request.
        4. Extract:
           - Current status (Pending / Approved / Denied /
             More Info Needed)
           - Date submitted
           - Any payer notes or denial reasons
        5. Use update_status action with MRN "{mrn}" and the
           current status. Use portal "covermymeds".
        6. If status is "Denied", use send_alert with the
           denial reason.
        7. If status is "Pending" and submitted more than
           3 days ago, use send_alert to flag the delay.
        8. If status is "Approved", use send_alert to notify
           the clinic.
        9. Use done action to report findings.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=2,
    )

    try:
        history = await agent.run(
            max_steps=DEFAULT_MAX_STEPS_STATUS_MONITOR
        )
        if not history.is_done():
            print(
                f"Monitor did not complete — used all "
                f"{DEFAULT_MAX_STEPS_STATUS_MONITOR} steps"
            )
            return None
        return history.final_result()
    except Exception as e:
        print(f"Monitor failed for {mrn}: {e}")
        return None


async def monitor_claimmd(mrn: str, patient_name: str):
    """Check Claim.MD test portal for claim status."""
    browser = Browser(headless=True)

    agent = Agent(
        task=f"""
        Check claim status on Claim.MD test portal.

        1. Navigate to {CLAIMMD_URL} and log in with test
           credentials (username: x]claimmd_username[x,
           password: x]claimmd_password[x).
        2. Find the most recent claim for patient
           {patient_name}.
        3. Extract the current status and any response
           messages.
        4. Use update_status action with MRN "{mrn}" and
           portal "claimmd".
        5. If there are rejection codes, use send_alert
           with the details.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
    )

    try:
        history = await agent.run(
            max_steps=DEFAULT_MAX_STEPS_STATUS_MONITOR
        )
        if not history.is_done():
            print(
                f"Monitor did not complete — used all "
                f"{DEFAULT_MAX_STEPS_STATUS_MONITOR} steps"
            )
            return None
        return history.final_result()
    except Exception as e:
        print(f"Monitor failed for {mrn}: {e}")
        return None
