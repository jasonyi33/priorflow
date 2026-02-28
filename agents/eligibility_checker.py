"""
Agent 1: Eligibility Checker.

Navigates Stedi (test mode) and/or Claim.MD (test account) to verify
patient coverage and determine if prior authorization is required.

Owned by Dev 2.
"""

from browser_use import Agent, Browser, ChatBrowserUse, Tools, ActionResult
from dotenv import load_dotenv
import json

from agents.base import (
    load_chart,
    get_browser_config,
    get_sensitive_data,
)
from shared.constants import (
    STEDI_URL,
    CLAIMMD_URL,
    DEFAULT_MAX_STEPS_ELIGIBILITY,
    DEFAULT_MAX_ACTIONS_PER_STEP,
)

load_dotenv()

tools = Tools()

# Track which portal the current run targets so save_eligibility
# can route to the correct parser.
_current_portal: str = "stedi"


@tools.action("Load patient chart and insurance data")
async def load_patient(mrn: str) -> ActionResult:
    chart = load_chart(mrn)
    return ActionResult(
        extracted_content=json.dumps(chart, indent=2),
        long_term_memory=(
            f"Patient: {chart['patient']['name']}, "
            f"DOB: {chart['patient']['dob']}, "
            f"Payer: {chart['insurance']['payer']}, "
            f"Member ID: {chart['insurance']['member_id']}"
        ),
    )


@tools.action("Save eligibility result to output")
async def save_eligibility(mrn: str, result: str) -> ActionResult:
    from tools.eligibility_parser import (
        parse_stedi_response,
        parse_claimmd_response,
    )
    from tools.db_client import save_eligibility_result

    if _current_portal == "claimmd":
        parsed = parse_claimmd_response(mrn, result)
    else:
        parsed = parse_stedi_response(mrn, result)

    await save_eligibility_result(parsed)
    return ActionResult(
        extracted_content=f"Eligibility saved for {mrn}",
        is_done=True,
        success=True,
    )


async def check_eligibility_stedi(mrn: str):
    """Use Stedi test mode to check eligibility via their web UI."""
    global _current_portal
    _current_portal = "stedi"

    browser_config = get_browser_config()
    browser = Browser(headless=browser_config["headless"])

    agent = Agent(
        task=f"""
        You are a healthcare eligibility verification assistant.

        1. Use load_patient action with MRN "{mrn}" to get patient
           and insurance data.
        2. Navigate to {STEDI_URL} and log in.
        3. Make sure "Test mode" is toggled ON.
        4. Click to create a new eligibility check.
        5. Select the payer that matches the patient's insurance.
        6. Fill in the provider information (name, NPI from chart).
        7. Fill in the subscriber/patient information
           (name, DOB, member ID).
           NOTE: In test mode, use predefined mock values if the
           payer requires specific test data.
        8. Submit the eligibility check.
        9. Wait for the response and extract:
           - Coverage status (active/inactive)
           - Copay amounts
           - Deductible information
           - Whether prior authorization is required
           - Any service-specific restrictions
        10. Use save_eligibility action with the extracted
            information as a text summary.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=DEFAULT_MAX_ACTIONS_PER_STEP,
    )

    try:
        history = await agent.run(
            max_steps=DEFAULT_MAX_STEPS_ELIGIBILITY
        )
        if not history.is_done():
            print(
                f"Agent did not complete — used all "
                f"{DEFAULT_MAX_STEPS_ELIGIBILITY} steps"
            )
            return None
        return history.final_result()
    except Exception as e:
        print(f"Agent failed for {mrn}: {e}")
        return None


async def check_eligibility_claimmd(mrn: str):
    """Use Claim.MD test account for eligibility check.

    Claim.MD test account behavior:
    - Generates rejections/denials based on insured ID value
    - Returns sample eligibility data for any input
    """
    global _current_portal
    _current_portal = "claimmd"

    browser_config = get_browser_config()
    browser = Browser(headless=browser_config["headless"])

    agent = Agent(
        task=f"""
        You are a healthcare eligibility verification assistant.

        1. Use load_patient action with MRN "{mrn}" to get patient
           and insurance data.
        2. Navigate to {CLAIMMD_URL} and log in with test
           credentials (username: x]claimmd_username[x,
           password: x]claimmd_password[x).
        3. Navigate to the eligibility check section.
        4. Select the appropriate payer.
        5. Enter the patient's subscriber/member information.
        6. Submit the eligibility request.
        7. Parse the response — look for:
           - Coverage confirmation
           - Benefit details
           - Any PA requirements flagged
           - Rejection codes (if member ID triggers a denial)
        8. Use save_eligibility action with the parsed response
           data as a text summary.

        NOTE: The Claim.MD test account generates rejections/denials
        based on the insured ID value.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=DEFAULT_MAX_ACTIONS_PER_STEP,
    )

    try:
        history = await agent.run(
            max_steps=DEFAULT_MAX_STEPS_ELIGIBILITY
        )
        if not history.is_done():
            print(
                f"Agent did not complete — used all "
                f"{DEFAULT_MAX_STEPS_ELIGIBILITY} steps"
            )
            return None
        return history.final_result()
    except Exception as e:
        print(f"Agent failed for {mrn}: {e}")
        return None
