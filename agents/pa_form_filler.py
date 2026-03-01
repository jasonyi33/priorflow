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


def _format_phone(raw: str) -> str:
    """Normalize phone to XXX-XXX-XXXX format for CoverMyMeds."""
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) == 7:
        digits = "555" + digits  # prefix area code for short numbers
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return raw  # return as-is if can't format


def _infer_gender(first_name: str) -> str:
    """Simple heuristic for demo purposes — infer gender from first name."""
    female_names = {"jane", "sarah", "lisa", "mary", "emily", "anna", "emma", "jessica", "ashley"}
    male_names = {"david", "john", "james", "robert", "michael", "william", "daniel", "mark", "tom"}
    lower = first_name.lower()
    if lower in female_names:
        return "Female"
    if lower in male_names:
        return "Male"
    return "Female"  # default fallback


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
async def generate_justification(mrn: str) -> ActionResult:
    """Build a medical necessity narrative from the full patient chart.

    Uses the standalone justification generator for a comprehensive narrative
    including prior therapies, labs, imaging, and provider info.
    """
    from tools.chart_loader import load_chart as load_chart_pydantic
    from tools.justification_gen import generate_justification as gen_justification

    chart = load_chart_pydantic(mrn)
    narrative = gen_justification(chart)
    return ActionResult(
        extracted_content=narrative,
        long_term_memory="Clinical justification has been generated with full detail",
    )


@tools.action("Record what fields were filled and any gaps found")
async def record_submission(
    mrn: str,
    fields_filled: str,
    gaps_detected: str,
    justification_summary: str,
    submission_status: str,
) -> ActionResult:
    """Save a PARequest-conformant submission record.

    Args:
        mrn: Patient MRN
        fields_filled: Comma-separated list of fields successfully filled
        gaps_detected: Comma-separated list of "GAP: field — reason" entries
        justification_summary: Clinical justification narrative text
        submission_status: "submitted" or "pending"
    """
    from datetime import datetime, timezone
    from shared.models import PARequest, PAStatusEnum, Portal
    from tools.db_client import save_pa_request

    chart = load_chart(mrn)
    med_name = chart.get("medication", {}).get("name", "Unknown")
    med_dose = chart.get("medication", {}).get("dose", "")

    fields_list = [f.strip() for f in fields_filled.split(",") if f.strip()]
    gaps_list = [g.strip() for g in gaps_detected.split(",") if g.strip()]

    status = (
        PAStatusEnum.SUBMITTED if submission_status.lower() == "submitted"
        else PAStatusEnum.PENDING
    )
    now = datetime.now(timezone.utc)

    pa_request = PARequest(
        mrn=mrn,
        portal=Portal.COVERMYMEDS,
        medication_or_procedure=f"{med_name} {med_dose}".strip(),
        status=status,
        fields_filled=fields_list,
        gaps_detected=gaps_list,
        justification_summary=justification_summary,
        created_at=now,
        updated_at=now,
    )

    await save_pa_request(pa_request)

    return ActionResult(
        extracted_content=(
            f"PA submission recorded for {mrn}:\n"
            f"  Status: {status.value}\n"
            f"  Fields filled: {len(fields_list)}\n"
            f"  Gaps detected: {len(gaps_list)}\n"
            f"  Saved to output/pa_submission_{mrn}.json"
        ),
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

    # Format phone numbers to XXX-XXX-XXXX
    provider_phone = _format_phone(provider.get("phone", ""))
    provider_fax = _format_phone(provider.get("fax", ""))

    # Infer gender from patient first name
    patient_gender = _infer_gender(patient["first_name"])

    # Format prior therapies as readable string
    therapies_text = "\n".join(f"  - {t}" for t in prior_therapies)
    labs_text = "\n".join(f"  - {k}: {v}" for k, v in labs.items())
    imaging_text = "\n".join(f"  - {k}: {v}" for k, v in imaging.items())

    agent = Agent(
        task=f"""
You are a prior authorization specialist. Submit a PA request on CoverMyMeds.
IMPORTANT: You have limited steps. Be efficient — combine actions, avoid unnecessary scrolling/searching.

═══ STEP 1: LOAD DATA ═══
Use load_chart_action and load_eligibility TOGETHER with MRN "{mrn}".

═══ STEP 2: LOGIN ═══
Log in if needed (skip if already on dashboard):
  - Username: x]cmm_username[x
  - Password: x]cmm_password[x

2FA HANDLING (only if prompted):
  a) Click "Send me an email" to trigger the code.
  b) Open a NEW TAB → https://mail.google.com
  c) Click the VERY TOP/NEWEST email from Okta (subject: "One-time verification code").
     CRITICAL: Always pick the newest email at the top, NEVER an older one.
  d) Copy the 6-digit code from the email body.
  e) Switch back to CoverMyMeds tab (NOTE: tab switch ends the current action — enter the code in the NEXT step).
  f) Click "Enter a verification code instead" if you see that option.
  g) Type the code into the input field (use clear: True) and click Verify.

═══ STEP 3: NEW REQUEST ═══
Click "New Request" on the dashboard. Fill the request creation form:
  - Medication: "{medication.get('name', 'Humira')}" → select from autocomplete dropdown
  - Primary Diagnosis: "{diagnosis['icd10']}" → select "{diagnosis['icd10']} - {diagnosis['description']}" from autocomplete, then click "Continue"
  - Patient: First="{patient['first_name']}", Last="{patient['last_name']}", Gender="{patient_gender}", DOB="{dob_formatted}", Zip="75001"
  - Click "Continue" to advance past patient demographics
  - Insurance: BIN="{insurance['bin']}", PCN="{insurance['pcn']}", Group="{insurance['rx_group']}"

Wait for forms list. Select the FIRST "CVS Caremark" form you see (button: "Start Request").
DO NOT click "Show More Forms" — the first CVS Caremark result is correct.
If an interstitial "medications may be covered" page appears, click "Continue Prior Auth".

═══ STEP 4: FILL PA FORM — PATIENT SECTION ═══
  - Member ID: "{insurance['member_id']}"
  - Street: "123 Main St" (placeholder — data gap)
  - City: "Dallas" (placeholder)
  - State: select "Texas"
  - Zip: "75001"

═══ STEP 5: FILL PA FORM — DRUG SECTION ═══
  - Quantity: "1"
  - Dosage Form: select "Kit" from dropdown (NOT "Pen" — it's not available)
  - DAW: select "No"
  - Days Supply: "30"

═══ STEP 6: FILL PA FORM — PROVIDER SECTION ═══
  - NPI: "{provider['npi']}"
  - First: "{provider_first}", Last: "{provider_last}"
  - Street: "456 Medical Dr" (placeholder — data gap)
  - City: "Dallas" (placeholder)
  - State: select "Texas"
  - Zip: "75001"
  - Phone: "{provider_phone}" (format XXX-XXX-XXXX)
  - Fax: "{provider_fax}"

═══ STEP 7: TYPE OF REVIEW ═══
  - Urgent review: select "No"

═══ STEP 8: SUBMIT + RECORD ═══
Click "Send To Prescriber" (NOT "Send To Plan").
  - Select "Email" method → "Continue"
  - Enter prescriber email: abhi.pasam@gmail.com → "Send email"

After confirmation, call generate_justification with MRN "{mrn}".
Then call record_submission with:
  - mrn: "{mrn}"
  - fields_filled: "patient_first_name, patient_last_name, patient_dob, patient_gender, insurance_member_id, medication_quantity, medication_dosage_form, medication_daw, days_supply, diagnosis_icd10, provider_npi, provider_first_name, provider_last_name, provider_phone, provider_fax, urgent_review"
  - gaps_detected: "GAP: patient_address — using placeholder, GAP: provider_address — using placeholder"
  - justification_summary: the text from generate_justification
  - submission_status: "submitted"
""",
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=3,
        max_failures=5,
        generate_gif=True,
        step_timeout=120,
        directly_open_url=False,
        save_conversation_path=f"output/conversation_{mrn}.json",
        extend_system_message=(
            "EFFICIENCY RULES:\n"
            "- Combine multiple input actions per step (up to 3). Fill adjacent fields together.\n"
            "- NEVER click 'Show More Forms' — always select the first matching form.\n"
            "- Tab switch terminates the current action sequence. Plan: switch tab in one step, then interact in the next.\n"
            "- For dropdowns, use select_dropdown action directly — don't click then select separately.\n"
            "- If a field is not visible, scroll to find it — don't navigate away.\n"
            "- If input shows 'Invalid', try clearing the field first (clear: True) then re-enter.\n"
            "- Do NOT create files, write notes, or make todo lists — just fill the form.\n"
        ),
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
    access_key: str, patient_last: str, patient_dob: str, mrn: str = "UNKNOWN"
):
    """Handle pharmacy-initiated PA: enter an access key from a fax.

    Flow: Navigate to key.covermymeds.com → Enter key + patient info →
    Review pre-populated form → Fill missing clinical info → Submit.
    """
    browser_config = get_browser_config()
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

    # Format DOB for the form
    dob_parts = patient_dob.split("-")
    dob_formatted = (
        f"{dob_parts[1]}/{dob_parts[2]}/{dob_parts[0]}"
        if len(dob_parts) == 3
        else patient_dob
    )

    agent = Agent(
        task=f"""
You are a prior authorization specialist. A pharmacy has initiated a PA request
and sent a fax with an access key. Complete the PA using the key.

═══════════════════════════════════════════════════════════════
STEP 1: ENTER ACCESS KEY
═══════════════════════════════════════════════════════════════
You are on the CoverMyMeds key lookup page.
Enter the following information:
  - Access Key: {access_key}
  - Patient Last Name: {patient_last}
  - Date of Birth: {dob_formatted} (format MM/DD/YYYY)

Click "Find Request" or the submit button.
Wait for the form to load.

═══════════════════════════════════════════════════════════════
STEP 2: REVIEW PRE-POPULATED FORM
═══════════════════════════════════════════════════════════════
The pharmacy has already filled in some fields (medication, patient info).
Review what's been filled and identify any missing required fields.

═══════════════════════════════════════════════════════════════
STEP 3: FILL MISSING CLINICAL INFO
═══════════════════════════════════════════════════════════════
If the form has clinical questions or empty required fields:
  - Use load_chart_action with MRN "{mrn}" to get clinical data
  - Fill in diagnosis, prior therapies, labs as needed
  - Answer any clinical criteria questions using chart data

═══════════════════════════════════════════════════════════════
STEP 4: SUBMIT
═══════════════════════════════════════════════════════════════
Click "Send To Prescriber" and enter: abhi.pasam@gmail.com
Confirm and send.

═══════════════════════════════════════════════════════════════
STEP 5: RECORD RESULTS
═══════════════════════════════════════════════════════════════
Use record_submission with:
  - mrn: "{mrn}"
  - fields_filled: comma-separated list of fields you filled
  - gaps_detected: comma-separated list of any missing fields
  - justification_summary: "Pharmacy-initiated PA via access key {access_key}"
  - submission_status: "submitted" or "pending"
""",
        llm=ChatBrowserUse(),
        browser=browser,
        tools=tools,
        sensitive_data=get_sensitive_data(),
        use_vision=True,
        max_actions_per_step=2,
        max_failures=5,
        generate_gif=True,
        step_timeout=120,
        directly_open_url=False,
        save_conversation_path=f"output/conversation_key_{access_key}.json",
        initial_actions=[
            {"navigate": {"url": COVERMYMEDS_KEY_URL}},
        ],
    )

    try:
        history = await agent.run(max_steps=30)
        if not history.is_done():
            print(f"⚠️  Key flow agent did not complete — used all 30 steps")
        return history
    except Exception as e:
        print(f"❌ Key flow agent failed: {e}")
        return None
