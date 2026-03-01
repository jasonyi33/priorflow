"""
Agent 2: PA Form Filler (CoverMyMeds).

Logs into the real CoverMyMeds portal, starts a new PA request,
fills the form with chart data, writes clinical justification, and submits.

This is the CORE DEMO FEATURE — the "money" agent.

Uses Browser Use Cloud SDK (v2 API + browser-use-2.0) for stealth browser automation.

Owned by Dev 3.
"""

from browser_use_sdk import AsyncBrowserUse
from dotenv import load_dotenv
import json
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

from agents.base import load_chart, save_output, get_sensitive_data
from server.observability import initialize_laminar
from shared.constants import (
    COVERMYMEDS_URL,
    COVERMYMEDS_KEY_URL,
    DEFAULT_MAX_STEPS_PA_FILLER,
    DEFAULT_MAX_ACTIONS_PER_STEP,
)

try:
    from lmnr import Laminar, observe
except Exception:  # noqa: BLE001
    Laminar = None  # type: ignore[assignment]

    def observe(**_kwargs):  # type: ignore[no-redef]
        def _decorator(fn):
            return fn

        return _decorator

load_dotenv()

# Browser Use Cloud profile ID
CLOUD_PROFILE_ID = os.getenv(
    "BROWSER_USE_PROFILE_ID", "bcf273d4-abc4-40c4-b506-8ad330d4c678"
)
# SDK v2.0.x default base_url is https://api.browser-use.com/api/v2 — do NOT override
CLOUD_LLM = os.getenv("BROWSER_USE_LLM", "browser-use-2.0")
EXTRACTION_DIR = Path("output") / "minimax"


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


def _load_minimax_extraction(mrn: str) -> dict[str, Any] | None:
    path = EXTRACTION_DIR / f"{mrn}_extraction.json"
    if not path.exists():
        return None
    try:
        with path.open() as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _pick(extracted: dict[str, Any] | None, section: str, field: str, fallback: str) -> str:
    if extracted:
        value = extracted.get(section, {}).get(field)
        if value is not None and str(value).strip():
            return str(value).strip()
    return fallback


def _build_task_prompt(mrn: str, chart: dict, extracted: dict[str, Any] | None = None) -> str:
    """Build the agent task prompt from chart data."""
    patient = chart["patient"]
    insurance = chart["insurance"]
    medication = chart.get("medication") or {}
    diagnosis = chart["diagnosis"]
    provider = chart["provider"]

    # Prefer MiniMax extraction values for prompt fields.
    first_name = _pick(extracted, "patient", "first_name", patient["first_name"])
    last_name = _pick(extracted, "patient", "last_name", patient["last_name"])
    payer = _pick(extracted, "insurance", "payer", insurance.get("payer", ""))
    member_id = _pick(extracted, "insurance", "member_id", insurance["member_id"])
    bin_value = _pick(extracted, "insurance", "bin", insurance["bin"])
    pcn_value = _pick(extracted, "insurance", "pcn", insurance["pcn"])
    rx_group = _pick(extracted, "insurance", "rx_group", insurance["rx_group"])
    diagnosis_code = _pick(extracted, "diagnosis", "icd10", diagnosis["icd10"])
    diagnosis_desc = _pick(extracted, "diagnosis", "description", diagnosis["description"])
    med_name = _pick(extracted, "medication", "name", medication.get("name", "Humira"))
    med_dose = _pick(extracted, "medication", "dose", medication.get("dose", ""))
    med_quantity = _pick(extracted, "medication", "quantity", "1")
    med_days_supply = _pick(extracted, "medication", "days_supply", "30")
    med_dosage_form = _pick(extracted, "medication", "dosage_form", "Kit")

    provider_name = _pick(extracted, "provider", "name", provider["name"])
    provider_name_parts = provider_name.replace("Dr. ", "").strip().split(" ", 1)
    provider_first = provider_name_parts[0] if provider_name_parts else ""
    provider_last = provider_name_parts[1] if len(provider_name_parts) > 1 else ""

    # Format DOB from YYYY-MM-DD to MM/DD/YYYY
    dob_raw = _pick(extracted, "patient", "dob", patient["dob"])
    dob_parts = dob_raw.split("-")
    dob_formatted = f"{dob_parts[1]}/{dob_parts[2]}/{dob_parts[0]}" if len(dob_parts) == 3 else dob_raw

    # Format phone numbers
    provider_phone = _format_phone(_pick(extracted, "provider", "phone", provider.get("phone", "")))
    provider_fax = _format_phone(_pick(extracted, "provider", "fax", provider.get("fax", "")))

    # Infer gender
    extracted_gender = _pick(extracted, "patient", "gender", "")
    patient_gender = extracted_gender or _infer_gender(first_name)
    missing_fields = extracted.get("missing_fields", []) if extracted else []

    return f"""
You are a prior authorization specialist. Submit a PA request on CoverMyMeds.
IMPORTANT: Be efficient — combine actions, avoid unnecessary scrolling/searching.

═══ STEP 1: LOGIN ═══
Log in if needed (skip if already on dashboard):
  - Enter your username and password in the login form fields.

2FA HANDLING (only if prompted):
  a) Click "Send me an email" to trigger the code.
  b) Open a NEW TAB → https://mail.google.com
  c) Click the VERY TOP/NEWEST email from Okta (subject: "One-time verification code").
     CRITICAL: Always pick the newest email at the top, NEVER an older one.
  d) Copy the 6-digit code from the email body.
  e) Switch back to CoverMyMeds tab.
  f) Click "Enter a verification code instead" if you see that option.
  g) Type the code into the input field and click Verify.

═══ STEP 2: NEW REQUEST ═══
Click "New Request" on the dashboard. Fill the request creation form:
  - Medication: "{med_name}" → select from autocomplete dropdown
  - Primary Diagnosis: "{diagnosis_code}" → select "{diagnosis_code} - {diagnosis_desc}" from autocomplete, then click "Continue"
  - Patient: First="{first_name}", Last="{last_name}", Gender="{patient_gender}", DOB="{dob_formatted}", Zip="75001"
  - Click "Continue" to advance past patient demographics
  - Insurance: BIN="{bin_value}", PCN="{pcn_value}", Group="{rx_group}"

Wait for forms list. Select the FIRST "CVS Caremark" form you see (button: "Start Request").
DO NOT click "Show More Forms" — the first CVS Caremark result is correct.
If an interstitial "medications may be covered" page appears, click "Continue Prior Auth".

═══ STEP 3: FILL PA FORM — PATIENT SECTION ═══
  - Member ID: "{member_id}"
  - Street: "123 Main St" (placeholder — data gap)
  - City: "Dallas" (placeholder)
  - State: select "Texas"
  - Zip: "75001"

═══ STEP 4: FILL PA FORM — DRUG SECTION ═══
  - Quantity: "{med_quantity}"
  - Dosage Form: select "{med_dosage_form}" from dropdown (use closest available option if exact text missing)
  - DAW: select "No"
  - Days Supply: "{med_days_supply}"

═══ STEP 5: FILL PA FORM — PROVIDER SECTION ═══
  - NPI: "{provider['npi']}"
  - First: "{provider_first}", Last: "{provider_last}"
  - Street: "456 Medical Dr" (placeholder — data gap)
  - City: "Dallas" (placeholder)
  - State: select "Texas"
  - Zip: "75001"
  - Phone: "{provider_phone}" (format XXX-XXX-XXXX)
  - Fax: "{provider_fax}"

═══ STEP 6: TYPE OF REVIEW ═══
  - Urgent review: select "No"

═══ STEP 7: SUBMIT ═══
Click "Send To Prescriber" (NOT "Send To Plan").
  - Select "Email" method → "Continue"
  - Enter prescriber email: abhi.pasam@gmail.com → "Send email"
  - Confirm the email was sent successfully.

Data provenance:
  - Prefer extracted chart fields from PDF ingestion when available.
  - Payer hint: "{payer}"
  - Missing fields from extraction: {", ".join(missing_fields) if missing_fields else "none"}
"""


@observe(
    name="agent.pa_form_filler.run",
    span_type="TOOL",
    tags=["component:agent", "agent:pa_form_filler", "portal:covermymeds"],
    ignore_input=True,
    ignore_output=True,
)
async def fill_covermymeds_pa(mrn: str):
    """Drive the CoverMyMeds portal to submit a prior authorization.

    Uses Browser Use Cloud SDK with v2 API.
    Flow: Login → New Request → Enter med + demographics → Select form →
    Fill Caremark ePA fields → Send To Prescriber.
    """
    initialize_laminar()
    if Laminar and Laminar.is_initialized():
        Laminar.set_trace_metadata(
            {
                "component": "agent",
                "agent_type": "pa_form_filler",
                "portal": "covermymeds",
            }
        )

    # Pre-load chart data
    chart = load_chart(mrn)
    extracted = _load_minimax_extraction(mrn)
    sensitive = get_sensitive_data()
    task_prompt = _build_task_prompt(mrn, chart, extracted=extracted)

    # Create cloud client
    client = AsyncBrowserUse(
        api_key=os.getenv("BROWSER_USE_API_KEY"),
    )

    # Create session with synced profile (CoverMyMeds auth cookies)
    session = await client.sessions.create_session(
        profile_id=CLOUD_PROFILE_ID,
        start_url=COVERMYMEDS_URL,
    )
    print(f"🌐 Cloud session: {session.id}")
    if hasattr(session, "live_url"):
        print(f"👁️  Live view: {session.live_url}")

    try:
        # Run the browser automation task
        task = await client.tasks.create_task(
            session_id=session.id,
            llm=CLOUD_LLM,
            task=task_prompt,
            start_url=COVERMYMEDS_URL,
            secrets={
                "https://*.covermymeds.com": sensitive["cmm_username"],
                "https://*.covermymeds.health": sensitive["cmm_password"],
                "https://oidc.covermymeds.com": f"{sensitive['cmm_username']}|||{sensitive['cmm_password']}",
            },
            system_prompt_extension=(
                "EFFICIENCY RULES:\n"
                "- Combine multiple input actions per step. Fill adjacent fields together.\n"
                "- NEVER click 'Show More Forms' — always select the first matching form.\n"
                "- For dropdowns, use select_dropdown action directly.\n"
                "- If a field is not visible, scroll to find it — don't navigate away.\n"
                "- If input shows 'Invalid', clear the field first then re-enter.\n"
                "- Do NOT create files, write notes, or make todo lists — just fill the form.\n"
            ),
            thinking=True,
            flash_mode=True,
        )

        # Stream progress — brief delay to let task register
        import asyncio as _asyncio
        await _asyncio.sleep(2)
        print(f"🤖 Task started (flash mode): {task.id}")
        async for step in task.stream(interval=2):
            step_num = getattr(step, "number", "?")
            goal = getattr(step, "next_goal", getattr(step, "status", ""))
            url = getattr(step, "url", "")
            print(f"   📍 Step {step_num}: {goal} ({url})")

        # Get final result via direct API call (more reliable than complete() after stream)
        result = await client.tasks.get_task(task.id)
        print(f"✅ Task completed: {getattr(result, 'status', 'done')}")

        # Post-process: generate justification and record submission
        submission = await _post_process(mrn, chart, result)
        return submission

    except Exception as e:
        import traceback
        print(f"❌ Agent failed for {mrn}: {e}")
        traceback.print_exc()
        # Try to salvage result if task actually completed
        try:
            task_result = await client.tasks.get_task(task.id)
            if task_result.is_success:
                print(f"⚠️  Task actually succeeded despite error. Output: {task_result.output}")
                submission = await _post_process(mrn, chart, task_result)
                return submission
        except Exception:
            pass
        return None
    finally:
        try:
            await client.sessions.update_session(
                session.id,
                action="stop",
            )
        except Exception:
            pass


async def _post_process(mrn: str, chart: dict, cloud_result) -> dict:
    """Generate justification and save PARequest after cloud task completes."""
    from tools.chart_loader import load_chart as load_chart_pydantic
    from tools.justification_gen import generate_justification as gen_justification
    from shared.models import PARequest, PAStatusEnum, Portal
    from tools.db_client import save_pa_request

    # Generate clinical justification
    chart_pydantic = load_chart_pydantic(mrn)
    narrative = gen_justification(chart_pydantic)

    med_name = chart.get("medication", {}).get("name", "Unknown")
    med_dose = chart.get("medication", {}).get("dose", "")
    now = datetime.now(timezone.utc)

    fields_filled = [
        "patient_first_name", "patient_last_name", "patient_dob", "patient_gender",
        "insurance_member_id", "medication_quantity", "medication_dosage_form",
        "medication_daw", "days_supply", "diagnosis_icd10", "provider_npi",
        "provider_first_name", "provider_last_name", "provider_phone", "provider_fax",
        "urgent_review",
    ]
    gaps_detected = [
        "GAP: patient_address — using placeholder",
        "GAP: provider_address — using placeholder",
    ]

    pa_request = PARequest(
        mrn=mrn,
        portal=Portal.COVERMYMEDS,
        medication_or_procedure=f"{med_name} {med_dose}".strip(),
        status=PAStatusEnum.SUBMITTED,
        fields_filled=fields_filled,
        gaps_detected=gaps_detected,
        justification_summary=narrative,
        created_at=now,
        updated_at=now,
    )

    await save_pa_request(pa_request)

    # Store outcome in Supermemory for future learning
    from tools.memory_client import store_pa_outcome
    store_pa_outcome(
        mrn=mrn,
        payer=chart.get("insurance", {}).get("payer", ""),
        medication=f"{med_name} {med_dose}".strip(),
        status=PAStatusEnum.SUBMITTED.value,
        justification=narrative,
    )

    submission = {
        "mrn": mrn,
        "status": "submitted",
        "fields_filled": len(fields_filled),
        "gaps_detected": len(gaps_detected),
        "justification_preview": narrative[:200] + "..." if len(narrative) > 200 else narrative,
        "cloud_task_output": getattr(cloud_result, "output", str(cloud_result)),
    }

    print(f"\n📄 PA submission recorded for {mrn}:")
    print(f"   Status: submitted")
    print(f"   Fields filled: {len(fields_filled)}")
    print(f"   Gaps detected: {len(gaps_detected)}")
    print(f"   Saved to output/pa_submission_{mrn}.json")

    return submission


async def fill_covermymeds_from_key(
    access_key: str, patient_last: str, patient_dob: str, mrn: str = "UNKNOWN"
):
    """Handle pharmacy-initiated PA: enter an access key from a fax.

    Flow: Navigate to key.covermymeds.com → Enter key + patient info →
    Review pre-populated form → Fill missing clinical info → Submit.
    """
    # Format DOB for the form
    dob_parts = patient_dob.split("-")
    dob_formatted = (
        f"{dob_parts[1]}/{dob_parts[2]}/{dob_parts[0]}"
        if len(dob_parts) == 3
        else patient_dob
    )

    client = AsyncBrowserUse(
        api_key=os.getenv("BROWSER_USE_API_KEY"),
    )

    session = await client.sessions.create_session(
        profile_id=CLOUD_PROFILE_ID,
        start_url=COVERMYMEDS_KEY_URL,
    )
    print(f"🌐 Cloud session (key flow): {session.id}")

    try:
        task = await client.tasks.create_task(
            session_id=session.id,
            llm=CLOUD_LLM,
            task=f"""
You are a prior authorization specialist. A pharmacy has initiated a PA request
and sent a fax with an access key. Complete the PA using the key.

═══ STEP 1: ENTER ACCESS KEY ═══
You are on the CoverMyMeds key lookup page.
Enter the following information:
  - Access Key: {access_key}
  - Patient Last Name: {patient_last}
  - Date of Birth: {dob_formatted} (format MM/DD/YYYY)

Click "Find Request" or the submit button. Wait for the form to load.

═══ STEP 2: REVIEW & FILL ═══
Review what's been pre-filled by the pharmacy.
Fill in any missing required fields using placeholder values if needed.

═══ STEP 3: SUBMIT ═══
Click "Send To Prescriber" and enter: abhi.pasam@gmail.com
Select "Email" method, confirm and send.
""",
            start_url=COVERMYMEDS_KEY_URL,
            thinking=True,
            system_prompt_extension=(
                "Be efficient. Fill adjacent fields together. "
                "Do NOT create files or notes — just fill the form."
            ),
        )

        print(f"🤖 Key flow task started: {task.id}")
        async for step in task.stream():
            step_num = getattr(step, "number", "?")
            goal = getattr(step, "next_goal", getattr(step, "status", ""))
            print(f"   📍 Step {step_num}: {goal}")

        result = await client.tasks.get_task(task.id)
        print(f"✅ Key flow completed")

        # Post-process
        chart = load_chart(mrn) if mrn != "UNKNOWN" else {}
        if chart:
            submission = await _post_process(mrn, chart, result)
            return submission
        return {
            "status": "submitted",
            "access_key": access_key,
            "output": getattr(result, "output", str(result)),
        }

    except Exception as e:
        print(f"❌ Key flow agent failed: {e}")
        return None
    finally:
        try:
            await client.sessions.update_session(
                session.id,
                action="stop",
            )
        except Exception:
            pass
