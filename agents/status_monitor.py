"""
Agent 3: Status Monitor.

Periodically checks PA status across CoverMyMeds and Claim.MD,
detects status changes, and sends alerts via Agentmail.

Owned by Dev 2.
"""

from browser_use import Agent, Browser, ChatBrowserUse, Tools, ActionResult
from dotenv import load_dotenv
import asyncio

from agents.base import save_output, get_browser_config, get_sensitive_data
from shared.constants import (
    COVERMYMEDS_URL,
    CLAIMMD_URL,
    DEFAULT_MAX_STEPS_STATUS_MONITOR,
)

load_dotenv()

tools = Tools()


@tools.action("Send alert email about PA status change")
async def send_alert(
    patient_name: str, status: str, portal: str, details: str
) -> ActionResult:
    """Send alert via Agentmail.

    TODO: Dev 2 — Replace with real Agentmail integration in Phase 3.
    """
    print(f"ALERT: PA for {patient_name} on {portal}")
    print(f"   Status: {status}")
    print(f"   Details: {details}")
    return ActionResult(
        extracted_content=f"Alert sent: {patient_name} — {status} on {portal}",
    )


@tools.action("Update PA status in database")
async def update_status(mrn: str, status: str, portal: str) -> ActionResult:
    save_output(f"status_{mrn}.json", {"mrn": mrn, "status": status, "portal": portal})
    return ActionResult(extracted_content=f"Status updated: {mrn} -> {status}")


async def monitor_covermymeds(mrn: str, patient_name: str):
    """Check CoverMyMeds dashboard for PA determination status.

    TODO: Dev 2 — Implement in Phase 2-3:
    1. Login to CoverMyMeds
    2. Find PA request for patient on dashboard
    3. Extract current status
    4. Compare to previous status (from DB)
    5. If changed, send alert
    """
    browser_config = get_browser_config()
    browser = Browser(headless=True)

    agent = Agent(
        task=f"""
        You are a PA status monitoring assistant.

        1. Navigate to {COVERMYMEDS_URL} and log in
           (username: x]cmm_username[x, password: x]cmm_password[x).
        2. On the dashboard, find the PA request for patient {patient_name}.
        3. Check the current status of the PA request.
        4. Extract:
           - Current status (Pending / Approved / Denied / More Info Needed)
           - Date submitted
           - Any payer notes or denial reasons
        5. Use update_status action with MRN "{mrn}" and the current status.
        6. If status is "Denied", use send_alert with the denial reason.
        7. If status is "Pending" and submitted more than 3 days ago,
           use send_alert to flag the delay.
        8. If status is "Approved", use send_alert to notify the clinic.
        9. Use done action to report findings.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=2,
    )

    history = await agent.run(max_steps=DEFAULT_MAX_STEPS_STATUS_MONITOR)
    return history.final_result()


async def monitor_claimmd(mrn: str, patient_name: str):
    """Check Claim.MD test portal for claim status.

    TODO: Dev 2 — Implement in Phase 3 (nice-to-have).
    """
    browser_config = get_browser_config()
    browser = Browser(headless=True)

    agent = Agent(
        task=f"""
        Check claim status on Claim.MD test portal.

        1. Navigate to {CLAIMMD_URL} and log in with test credentials
           (username: x]claimmd_username[x, password: x]claimmd_password[x).
        2. Find the most recent claim for patient {patient_name}.
        3. Extract the current status and any response messages.
        4. Use update_status action with MRN "{mrn}".
        5. If there are rejection codes, use send_alert with the details.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
    )

    history = await agent.run(max_steps=DEFAULT_MAX_STEPS_STATUS_MONITOR)
    return history.final_result()
