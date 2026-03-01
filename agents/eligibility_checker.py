"""
Agent 1: Eligibility Checker.

Navigates Stedi (test mode) to verify patient coverage and
determine if prior authorization is required.

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
    DEFAULT_MAX_STEPS_ELIGIBILITY,
    DEFAULT_MAX_ACTIONS_PER_STEP,
)
from server.observability import initialize_laminar

try:
    from lmnr import Laminar, observe
except Exception:  # noqa: BLE001
    Laminar = None  # type: ignore[assignment]

    def observe(**_kwargs):  # type: ignore[no-redef]
        def _decorator(fn):
            return fn

        return _decorator

load_dotenv()

tools = Tools()


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
    from tools.eligibility_parser import parse_stedi_response
    from tools.db_client import save_eligibility_result

    parsed = parse_stedi_response(mrn, result)
    await save_eligibility_result(parsed)
    return ActionResult(
        extracted_content=f"Eligibility saved for {mrn}",
        is_done=True,
        success=True,
    )


@observe(
    name="agent.eligibility.run",
    span_type="TOOL",
    tags=["component:agent", "agent:eligibility", "portal:stedi"],
    ignore_input=True,
    ignore_output=True,
)
async def check_eligibility_stedi(mrn: str):
    """Use Stedi test mode to check eligibility via their web UI."""
    initialize_laminar()
    if Laminar and Laminar.is_initialized():
        Laminar.set_trace_metadata(
            {
                "component": "agent",
                "agent_type": "eligibility",
                "portal": "stedi",
            }
        )

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
