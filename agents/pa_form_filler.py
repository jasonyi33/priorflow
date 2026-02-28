"""
Agent 2: PA Form Filler (CoverMyMeds).

Logs into the real CoverMyMeds portal, starts a new PA request,
fills the form with chart data, writes clinical justification, and submits.

This is the CORE DEMO FEATURE — the "money" agent.

Owned by Dev 3.
"""

from browser_use import Agent, Browser, BrowserProfile, ChatBrowserUse, Tools, ActionResult
from dotenv import load_dotenv
import asyncio
import json
import os
from pathlib import Path

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

    Flow: Login → New Request → Enter med + demographics → Select form →
    Fill Caremark ePA fields → Check Eligibility → Send To Plan.
    """
    browser_config = get_browser_config()
    # Use the real Chrome profile so saved CoverMyMeds login/cookies persist.
    # IMPORTANT: Close all Chrome windows before running this agent.
    browser = Browser(
        headless=browser_config["headless"],
        executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        user_data_dir="~/Library/Application Support/Google/Chrome",
        profile_directory="Default",
        args=["--disable-extensions", "--disable-background-networking"],
        wait_for_network_idle_page_load_time=3.0,
        minimum_wait_page_load_time=1.0,
        wait_between_actions=0.5,
    )

    # Pre-load chart data so we can embed key values directly in the prompt
    chart = load_chart(mrn)
    patient = chart["patient"]
    insurance = chart["insurance"]
    medication = chart.get("medication") or {}
    diagnosis = chart["diagnosis"]
    provider = chart["provider"]
    prior_therapies = chart.get("prior_therapies", [])
    labs = chart.get("labs", {})
    imaging = chart.get("imaging", {})

    # Split provider name (chart has "Dr. Sarah Smith" as single string)
    provider_name_parts = provider["name"].replace("Dr. ", "").strip().split(" ", 1)
    provider_first = provider_name_parts[0] if provider_name_parts else ""
    provider_last = provider_name_parts[1] if len(provider_name_parts) > 1 else ""

    # Format DOB from YYYY-MM-DD to MM/DD/YYYY for the form
    dob_parts = patient["dob"].split("-")
    dob_formatted = f"{dob_parts[1]}/{dob_parts[2]}/{dob_parts[0]}" if len(dob_parts) == 3 else patient["dob"]

    # Format prior therapies as readable string
    therapies_text = "\n".join(f"  - {t}" for t in prior_therapies)
    labs_text = "\n".join(f"  - {k}: {v}" for k, v in labs.items())
    imaging_text = "\n".join(f"  - {k}: {v}" for k, v in imaging.items())

    agent = Agent(
        task=f"""
You are a prior authorization specialist. Submit a PA request on CoverMyMeds
for the Caremark Electronic PA Form (2017 NCPDP).

═══════════════════════════════════════════════════════════════
STEP 1: LOAD DATA
═══════════════════════════════════════════════════════════════
Use load_chart_action with MRN "{mrn}" to get all patient data.
Use load_eligibility with MRN "{mrn}" to check prior eligibility results.

═══════════════════════════════════════════════════════════════
STEP 2: LOGIN TO COVERMYMEDS
═══════════════════════════════════════════════════════════════
You are already on the CoverMyMeds portal. Log in if needed:
  - Username: x]cmm_username[x
  - Password: x]cmm_password[x

IMPORTANT — EMAIL 2FA HANDLING:
If after login you see an email verification / 2FA prompt (Okta),
do the following:
  1. Open a NEW TAB and navigate to https://mail.google.com
  2. Gmail should already be logged in (using the same Chrome profile).
  3. Look for the most recent email from Okta or CoverMyMeds with a
     verification code or "Sign In" / "Verify" link.
  4. If it contains a CODE, copy it. If it contains a LINK, click the link.
  5. Switch back to the CoverMyMeds tab.
  6. Enter the verification code if needed, or the page may have
     auto-verified from clicking the link.
  7. Close the Gmail tab when done.

After login you should see the CoverMyMeds dashboard.

═══════════════════════════════════════════════════════════════
STEP 3: CREATE NEW REQUEST
═══════════════════════════════════════════════════════════════
On the dashboard, click the "New Request" button.
Then fill in these fields:
  - Medication: "{medication.get('name', 'Humira')}"
  - Patient First Name: "{patient['first_name']}"
  - Patient Last Name: "{patient['last_name']}"
  - Date of Birth: "{dob_formatted}"
  - BIN: "{insurance['bin']}"
  - PCN: "{insurance['pcn']}"
  - Group: "{insurance['rx_group']}"

Wait for the list of matching PA forms to appear.
Select the "Caremark Electronic PA Form (2017 NCPDP)" if available,
or the most appropriate ePA form for this medication and plan.
Then click "Start Request."

═══════════════════════════════════════════════════════════════
STEP 4: FILL PATIENT SECTION
═══════════════════════════════════════════════════════════════
The form has these Patient fields — fill what we have:

  Name:
    - First*: "{patient['first_name']}"
    - Last*: "{patient['last_name']}"
    - Prefix, Middle, Suffix: leave blank

  Date of Birth*: "{dob_formatted}" (format MM/DD/YYYY)

  Gender*: Select "Female" (for Jane Doe)

  Member ID: "{insurance['member_id']}"

  Address — WE DO NOT HAVE THIS DATA. The form requires:
    - Street* (required)
    - City* (required)
    - State* (required)
    - Zip* (required)
  These are GAPS. Skip if possible, or enter placeholder if form blocks progress.

  Phone: leave blank (we don't have this)

═══════════════════════════════════════════════════════════════
STEP 5: FILL DRUG SECTION
═══════════════════════════════════════════════════════════════
  Medication Name: should be pre-filled (read-only)

  Quantity*: Enter "1" (one pen per injection)

  Confirm dosage form*: Select the appropriate option from dropdown
    (look for "auto-injector" or "pen")

  "Should this request be reviewed for a brand only product (DAW-1)?":
    Select "No"

  Days Supply*: Enter "30" (biweekly dosing = 2 injections per 30 days)

  Primary Diagnosis: Enter "{diagnosis['icd10']}" — {diagnosis['description']}

═══════════════════════════════════════════════════════════════
STEP 6: FILL PROVIDER SECTION
═══════════════════════════════════════════════════════════════
  NPI*: "{provider['npi']}"

  Name:
    - First*: "{provider_first}"
    - Last*: "{provider_last}"

  Address — WE DO NOT HAVE PROVIDER ADDRESS. The form requires:
    - Street* (required)
    - City* (required)
    - State* (required)
    - Zip* (required)
  These are GAPS. Skip if possible, or enter placeholder if form blocks progress.

  Phone*: "{provider['phone']}" (format as XXX-XXX-XXXX: 555-010-0 → use "555-010-0100" or reformat)
  Fax: "{provider['fax']}"

═══════════════════════════════════════════════════════════════
STEP 7: TYPE OF REVIEW
═══════════════════════════════════════════════════════════════
  "Are you requesting an URGENT review?": Select "No"

═══════════════════════════════════════════════════════════════
STEP 8: SKIP ELIGIBILITY — SEND TO PRESCRIBER
═══════════════════════════════════════════════════════════════
Do NOT click "Send To Plan" (it requires valid insurance).
Instead, click the "Send To Prescriber" button.
When prompted for a prescriber email, enter: abhi.pasam@gmail.com
Confirm and send.

═══════════════════════════════════════════════════════════════
STEP 9: RECORD RESULTS
═══════════════════════════════════════════════════════════════
Use record_submission action with MRN "{mrn}" and a summary including:
- All fields successfully filled
- All gaps detected (missing data)
- Whether submission was successful or blocked

KNOWN DATA GAPS (fields required by form but missing from chart):
- patient address (street, city, state, zip) — all required
- patient phone — not required
- provider address (street, city, state, zip) — all required
- medication quantity (we're using "1" as default)
- medication days supply (we're using "30" as default)

CHART DATA AVAILABLE FOR REFERENCE:
Prior therapies:
{therapies_text}

Labs:
{labs_text}

Imaging:
{imaging_text}
""",
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=DEFAULT_MAX_ACTIONS_PER_STEP,
        generate_gif=True,
        step_timeout=120,
        directly_open_url=False,
        initial_actions=[
            {"navigate": {"url": COVERMYMEDS_URL}},
        ],
    )

    try:
        history = await agent.run(max_steps=DEFAULT_MAX_STEPS_PA_FILLER + 15)
        if not history.is_done():
            print(f"⚠️  Agent did not complete — used all {DEFAULT_MAX_STEPS_PA_FILLER} steps")
        return history
    except Exception as e:
        print(f"❌ Agent failed for {mrn}: {e}")
        return None


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
