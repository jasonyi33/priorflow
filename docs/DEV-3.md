# Dev 3 — Agent Engineer (PA Form Filler)

## Your Mission

Build Agent 2 — the CoverMyMeds PA form filler. This is the **core demo feature** and the single most important deliverable of the project. An AI agent filling a real PA form on the portal 950K providers use daily is what wins the hackathon.

## Your Files

```
agents/pa_form_filler.py       # Agent 2 — your primary deliverable
tools/justification_gen.py     # Clinical justification narrative builder
tools/form_mapper.py           # CoverMyMeds form field reference
tests/test_pa_agent.py         # You create this
```

**Do NOT modify:** `shared/models.py`, `convex/schema.ts`, `server/`, `frontend/`
If you need a new field on `PARequest`, ask Dev 1.

## Branch

```
git checkout -b dev-3/pa-filler
```

---

## Key Data Contracts

Your agent MUST output data conforming to this model (defined in `shared/models.py`):

**Agent 2 output — `PARequest`:**
```python
PARequest(
    mrn="MRN-00421",
    portal=Portal.COVERMYMEDS,
    medication_or_procedure="Humira (adalimumab) 40mg",
    status=PAStatusEnum.SUBMITTED,    # or PENDING if draft
    fields_filled=["patient_first_name", "diagnosis_icd10", "medication_name", ...],
    gaps_detected=["GAP: patient_address — need from provider"],
    justification_summary="Patient meets criteria...",
    submission_id="CMM-2026-0228-001",  # from CoverMyMeds if available
    gif_path="output/pa_MRN-00421.gif",
    created_at=datetime.now(UTC),
    updated_at=datetime.now(UTC),
)
```

**Input — reads from:**
- `data/charts/MRN-00421.json` — patient chart (loaded via `load_chart_action`)
- `output/eligibility_MRN-00421.json` — eligibility result from Agent 1 (optional, may not exist)

---

## Phase 0 TASK: Document CoverMyMeds Form Fields

**Before writing any code**, manually walk through CoverMyMeds:

1. Log into `https://www.covermymeds.health`
2. Click "New Request"
3. Enter "Humira" as medication
4. Enter test patient demographics + BIN/PCN/RxGroup
5. Select a PA form from the list
6. **Screenshot every page of the form**
7. Document each field name/label in `tools/form_mapper.py`

Update the `PA_FORM_FIELDS` and `CLINICAL_QUESTIONS` dicts with actual field labels you see. This reference is critical for the agent to fill forms correctly.

---

## Phase 1 (Hours 2–6) — Login + New Request Flow

### Hour 2–3: CoverMyMeds Login Automation

Test login with Browser Use `sensitive_data` pattern:

```python
agent = Agent(
    task="Log in to CoverMyMeds and report what you see on the dashboard.",
    llm=ChatBrowserUse(),
    browser=Browser(headless=False),
    sensitive_data={
        "cmm_username": os.getenv("CMM_USERNAME"),
        "cmm_password": os.getenv("CMM_PASSWORD"),
    },
)
```

In the task prompt, reference credentials as `x]cmm_username[x` and `x]cmm_password[x` — Browser Use replaces these with actual values without exposing them to the LLM.

**If login has MFA:** Pre-authenticate in a browser session and reuse the cookies, or use `initial_actions` to script the login:
```python
initial_actions=[
    {"navigate": {"url": "https://www.covermymeds.health"}},
    {"input": {"index": 1, "text": "x]cmm_username[x"}},
    {"input": {"index": 2, "text": "x]cmm_password[x"}},
    {"click": {"index": 3}},
]
```

### Hours 3–5: New Request Flow

Once logged in, automate:
1. Click "New Request"
2. Enter medication name (e.g., "Humira")
3. Enter patient first name, last name, DOB
4. Enter BIN, PCN, RxGroup from insurance info
5. Wait for matching PA forms to appear
6. Select the most appropriate form
7. Click "Start Request"

This gets you to the actual PA form. Test this flow until it works reliably.

### Hours 5–6: Begin Form Filling

Start filling form fields from chart data:
- Patient demographics (name, DOB)
- Provider info (name, NPI, practice, phone, fax)
- Diagnosis (ICD-10 code + description)
- Medication details (name, dose, frequency)

Target: 50% of form fields filled by Hour 6.

**Deliverables by Hour 6:**
- [ ] Agent logs into CoverMyMeds reliably
- [ ] Agent clicks "New Request" and enters medication + demographics
- [ ] Agent selects a PA form from the list
- [ ] Agent fills at least half the form fields

---

## Phase 2 (Hours 6–12) — Complete Form + Justification

### Hours 6–8: Fill All Form Fields

Complete the remaining form fields:
- Clinical questions (use chart data to answer)
- Prior therapies with dates
- Lab results
- Imaging results

### Hours 8–10: Clinical Justification

Implement `tools/justification_gen.py` — the `generate_justification()` function is already there, but enhance it:

```python
from tools.justification_gen import generate_justification
from tools.chart_loader import load_chart

chart = load_chart("MRN-00421")
narrative = generate_justification(chart)
print(narrative)
```

Also implement **gap detection** — when the agent encounters a required form field that has no corresponding chart data, it should record it:
```python
gaps_detected=["GAP: patient_address — need from provider", "GAP: prior_auth_number — not applicable"]
```

### Hours 10–12: End-to-End + GIF Recording

Run the full PA form fill with `generate_gif=True`:
```bash
uv run python scripts/run_pa.py MRN-00421
```

The GIF recording is your demo footage. Test the golden path:
1. Login -> New Request -> Humira -> Jane Doe + Aetna
2. Select form -> Fill all fields -> Generate justification
3. Review -> Submit (or record what was filled)

**Deliverables by Hour 12:**
- [ ] All form fields populated from chart data
- [ ] Clinical justification narrative written into form
- [ ] Gaps flagged for missing data
- [ ] GIF recording of full flow saved to `output/`
- [ ] Output saved as JSON matching `PARequest` schema

---

## Phase 3 (Hours 12–18) — Polish + Key Flow

### Hours 12–14: Reliability

- Run the PA form fill 3 times — it should succeed 2+ times
- Handle edge cases: dynamic form fields, multi-page forms, "More Info" sections
- Tune `max_steps` (currently 40) — increase if agent needs more steps

### Hours 14–16: Pharmacy-Initiated PA Flow (Nice-to-Have)

Implement `fill_covermymeds_from_key()`:
1. Navigate to `https://key.covermymeds.com/`
2. Enter access key + patient last name + DOB
3. Review pre-populated form
4. Fill missing clinical info
5. Submit

### Hours 16–18: Demo GIFs

Record clean demo footage:
- Run with `generate_gif=True` on MRN-00421 (Humira/Aetna)
- Run with MRN-00744 (Stelara — shows failed-Humira step therapy)
- Save GIFs to `output/` for demo presentation

---

## Testing Your Agent

**Standalone (no server needed):**
```bash
uv run python scripts/run_pa.py MRN-00421
```

**Watch the browser:**
The agent runs with `headless=False` by default. Watch it navigate CoverMyMeds in real-time.

**Check output:**
```bash
cat output/pa_submission_MRN-00421.json
```

**Create basic test** in `tests/test_pa_agent.py`:
```python
from tools.justification_gen import generate_justification
from tools.chart_loader import load_chart

def test_justification_generation():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "Humira" in narrative or "adalimumab" in narrative
    assert "M06.9" in narrative  # diagnosis code
    assert "methotrexate" in narrative.lower()  # prior therapy

def test_chart_has_required_fields_for_pa():
    chart = load_chart("MRN-00421")
    assert chart.medication is not None
    assert chart.medication.name == "Humira"
    assert chart.insurance.bin  # BIN required for CoverMyMeds
    assert chart.insurance.pcn
    assert chart.insurance.rx_group
    assert chart.provider.npi
```

## Portal Credentials

From `.env` — never hardcode:
- `CMM_USERNAME` / `CMM_PASSWORD` — CoverMyMeds login
- `BROWSER_USE_API_KEY` — required for `ChatBrowserUse()` LLM

## Common Issues

- **Agent can't find "New Request" button:** Add `use_vision=True` and be specific in the task prompt about button location ("top left corner of dashboard")
- **Form fields load dynamically:** Add waits in the task prompt — "Wait for the form to fully load before filling fields"
- **Agent fills wrong field:** Use `max_actions_per_step=2` to slow the agent down. Add field labels from `tools/form_mapper.py` to the task prompt
- **MFA blocks login:** Use `initial_actions` to script the login, or demo from an already-logged-in browser session
- **GIF not generated:** Make sure `generate_gif=True` is set on the Agent. GIFs are saved to a path in the agent's history result

## This Is the Money Feature

If nothing else works — no frontend, no eligibility check, no status monitor — a GIF of Agent 2 filling a real CoverMyMeds PA form is still a killer demo. Prioritize making this agent reliable above all else.
