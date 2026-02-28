"""
Agent 2: PA Form Filler (CoverMyMeds).

Logs into the real CoverMyMeds portal, starts a new PA request,
fills the form with chart data, writes clinical justification, and submits.

This is the CORE DEMO FEATURE — the "money" agent.

Owned by Dev 3.
"""

from browser_use import Agent, Browser, ChatBrowserUse, Tools, ActionResult
from dotenv import load_dotenv
import asyncio
import json
import os

from agents.base import load_chart, save_output, get_browser_config, get_sensitive_data
from shared.constants import (
    COVERMYMEDS_URL,
    COVERMYMEDS_KEY_URL,
    DEFAULT_MAX_STEPS_PA_FILLER,
    DEFAULT_MAX_ACTIONS_PER_STEP,
)

load_dotenv()

tools = Tools()


@tools.action("Load patient chart data for PA submission")
async def load_chart_action(mrn: str) -> ActionResult:
    chart = load_chart(mrn)
    return ActionResult(
        extracted_content=json.dumps(chart, indent=2),
        long_term_memory=(
            f"Patient: {chart['patient']['name']}, "
            f"DOB: {chart['patient']['dob']}, "
            f"Medication: {chart.get('medication', {}).get('name', 'N/A')} "
            f"{chart.get('medication', {}).get('dose', '')}, "
            f"Diagnosis: {chart['diagnosis']['icd10']} - {chart['diagnosis']['description']}, "
            f"BIN: {chart['insurance']['bin']}, PCN: {chart['insurance']['pcn']}, "
            f"RxGroup: {chart['insurance']['rx_group']}"
        ),
    )


@tools.action("Load eligibility results to check PA requirements")
async def load_eligibility(mrn: str) -> ActionResult:
    from pathlib import Path

    output_file = Path(f"output/eligibility_{mrn}.json")
    try:
        with open(output_file) as f:
            elig = json.load(f)
        return ActionResult(extracted_content=json.dumps(elig, indent=2))
    except FileNotFoundError:
        return ActionResult(
            extracted_content="No eligibility data found — proceed with PA anyway",
        )


@tools.action("Generate clinical justification narrative")
async def generate_justification(
    diagnosis: str,
    medication: str,
    prior_therapies: str,
    labs: str,
) -> ActionResult:
    """Build a medical necessity narrative from structured chart data.

    TODO: Dev 3 — Enhance in Phase 2 with more sophisticated narrative generation.
    Consider using Claude for richer clinical language.
    """
    narrative = (
        f"Clinical Justification for Prior Authorization\n\n"
        f"Patient presents with {diagnosis}. "
        f"The following conservative therapies have been attempted and failed "
        f"to provide adequate relief: {prior_therapies}. "
        f"Relevant laboratory findings include: {labs}. "
        f"Based on clinical guidelines and the patient's treatment history, "
        f"{medication} is medically necessary as the next appropriate step in "
        f"the treatment algorithm. The patient meets all payer criteria for "
        f"this therapy."
    )
    return ActionResult(
        extracted_content=narrative,
        long_term_memory="Clinical justification has been generated",
    )


@tools.action("Record what fields were filled and any gaps found")
async def record_submission(mrn: str, summary: str) -> ActionResult:
    save_output(f"pa_submission_{mrn}.json", {"mrn": mrn, "summary": summary})
    return ActionResult(
        extracted_content=f"PA submission recorded for {mrn}",
        is_done=True,
        success=True,
    )


async def fill_covermymeds_pa(mrn: str):
    """Drive the real CoverMyMeds portal to submit a prior authorization.

    TODO: Dev 3 — This is your primary task. Implement in Phases 1-2:
    1. Login with initial_actions for speed
    2. Navigate New Request flow
    3. Fill all form fields from chart data
    4. Generate clinical justification
    5. Flag any gaps (missing chart data)
    6. Submit or record draft
    """
    browser_config = get_browser_config()
    browser = Browser(headless=browser_config["headless"])

    agent = Agent(
        task=f"""
        You are a prior authorization specialist. Your job is to submit a PA
        request through the CoverMyMeds portal.

        STEP-BY-STEP INSTRUCTIONS:

        1. Use load_chart_action with MRN "{mrn}" to get all patient data.
        2. Use load_eligibility with MRN "{mrn}" to check prior eligibility results.

        3. Navigate to {COVERMYMEDS_URL} and log in with credentials
           (username: x]cmm_username[x, password: x]cmm_password[x).

        4. On the dashboard, click "New Request" (top left corner).

        5. Enter the MEDICATION name from the chart data.

        6. Enter patient demographic information:
           - Patient first name, last name, date of birth
           - BIN, PCN, and RxGroup from the insurance section

        7. A list of matching PA forms will populate. Choose the most
           appropriate form, then click "Start Request."

        8. Fill in ALL required fields on the PA form:
           - Patient demographics (name, DOB, address, phone)
           - Prescriber/provider info (name, NPI, practice, phone, fax)
           - Diagnosis (ICD-10 code and description)
           - Medication details (name, dose, frequency, NDC if asked)
           - Duration of therapy requested

        9. For clinical questions on the form:
           - Use generate_justification action to create a clinical narrative
           - Reference specific prior therapies with dates
           - Reference specific lab values with dates
           - Reference imaging results if relevant
           - Answer each clinical question using evidence from the chart

        10. Before submitting, review all fields for accuracy.

        11. Click "Send to Plan" to electronically submit the PA request.
            (If this is a demo and we don't want to actually submit, use the
            done action instead and report what was filled.)

        12. Use record_submission action to log what was done.

        IMPORTANT NOTES:
        - If any required information is MISSING from the chart, note it as
          "GAP: [field name] — need from provider" in your submission record.
        - If the form has questions you cannot answer from the chart data,
          flag them clearly.
        - Be thorough with clinical justification — this is what gets PAs approved.
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=DEFAULT_MAX_ACTIONS_PER_STEP,
        generate_gif=True,
    )

    history = await agent.run(max_steps=DEFAULT_MAX_STEPS_PA_FILLER)
    return history


async def fill_covermymeds_from_key(
    access_key: str, patient_last: str, patient_dob: str
):
    """Handle pharmacy-initiated PA: enter a key from a fax.

    TODO: Dev 3 — Implement in Phase 3 (nice-to-have).
    """
    browser_config = get_browser_config()
    browser = Browser(headless=browser_config["headless"])

    agent = Agent(
        task=f"""
        A pharmacy initiated a prior authorization for a patient.
        We received a fax with an access key.

        1. Navigate to {COVERMYMEDS_KEY_URL}
        2. Enter the access key: {access_key}
        3. Enter the patient's last name: {patient_last}
        4. Enter the patient's date of birth: {patient_dob}
        5. Review the pre-populated PA form
        6. Fill in any missing clinical information using chart data
        7. Complete and submit the PA request
        """,
        llm=ChatBrowserUse(),
        browser=browser,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
    )

    history = await agent.run(max_steps=30)
    return history
