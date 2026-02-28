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

```bash
git checkout -b dev-3/pa-filler
```

---

## Important: Data Types

There are **two** chart loading functions — know which to use where:

| Function | Returns | Use when |
|----------|---------|----------|
| `tools.chart_loader.load_chart(mrn)` | `PatientChart` (Pydantic object) | Tests, scripts, `tools/justification_gen.py`. Access fields via `chart.patient.name` |
| `agents.base.load_chart(mrn)` | `dict` (raw JSON) | Inside `@tools.action` functions in `agents/pa_form_filler.py`. Access fields via `chart['patient']['name']` |

The `@tools.action` `load_chart_action` at `agents/pa_form_filler.py:32-45` uses `agents.base.load_chart()` (returns dict, then `json.dumps()` it for the LLM). Your tests and `tools/justification_gen.py` use `tools.chart_loader.load_chart()` (returns validated Pydantic `PatientChart`).

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

- `data/charts/MRN-00421.json` — patient chart (loaded via `load_chart_action` at `agents/pa_form_filler.py:32-45`)
- `output/eligibility_MRN-00421.json` — eligibility result from Agent 1 / Dev 2 (loaded via `load_eligibility` at `agents/pa_form_filler.py:49-60`, optional — may not exist if Dev 2's agent hasn't run yet)

**Output — writes to:**

- `output/pa_submission_MRN-00421.json` — via `record_submission` action at `agents/pa_form_filler.py:93-99`
- Validated persistence: use `tools/db_client.py:save_pa_request()` which also writes to `output/pa_submission_{mrn}.json`

**Known data gaps in MRN-00421 fixture**: The fixture does NOT include patient address or phone number. CoverMyMeds will likely require these. Flag them as gaps:

```python
gaps_detected=["GAP: patient_address — need from provider", "GAP: patient_phone — need from provider"]
```

If Dev 1 adds these fields to the fixture, remove them from gaps.

---

## Phase 0 TASK: Document CoverMyMeds Form Fields

**Before writing any code**, manually walk through CoverMyMeds:

1. Log into `https://www.covermymeds.health`
2. Click "New Request"
3. Enter "Humira" as medication
4. Enter test patient data: Jane Doe, DOB 1985-03-15, BIN 004336, PCN ADV, RxGroup RX1234
5. Select a PA form from the list
6. **Screenshot every page of the form**
7. Update `tools/form_mapper.py` with actual field labels

**How to update `tools/form_mapper.py`:**

- Update `PA_FORM_FIELDS` dict (lines 32-64) — replace placeholder field labels with exact text you see on screen
- Update `CLINICAL_QUESTIONS["humira"]` list (lines 69-75) — add any clinical questions on the Humira PA form
- If you find required fields not in the chart data (address, phone, etc.), add them to the prompt as known gaps

---

## Phase 1 (Hours 2–6) — Login + New Request Flow

### Dependencies

- `.env` file with `CMM_USERNAME`, `CMM_PASSWORD`, and `BROWSER_USE_API_KEY` filled in
- `uv pip install -e ".[dev]"` completed
- Phase 0 CoverMyMeds walkthrough completed (form fields documented)

### Hour 2–3: CoverMyMeds Login Automation

The agent skeleton already has login configured at `agents/pa_form_filler.py:116-178`. The `sensitive_data` parameter is set up via `agents/base.py:get_sensitive_data()`.

Test login standalone:

```python
# Quick login test — run with: uv run python -c "..."
import asyncio, os
from browser_use import Agent, Browser, ChatBrowserUse
from agents.base import get_sensitive_data

async def test_login():
    agent = Agent(
        task="Log in to CoverMyMeds at https://www.covermymeds.health using credentials (username: x]cmm_username[x, password: x]cmm_password[x). Report what you see on the dashboard.",
        llm=ChatBrowserUse(),
        browser=Browser(headless=False),
        sensitive_data=get_sensitive_data(),
        use_vision=True,
    )
    history = await agent.run(max_steps=10)
    print(history.final_result())

asyncio.run(test_login())
```

In task prompts, reference credentials as `x]cmm_username[x` and `x]cmm_password[x` — Browser Use replaces these with actual values without exposing them to the LLM.

**If login has MFA:** Use `initial_actions` to script the login so the LLM starts from an authenticated state:

```python
initial_actions=[
    {"navigate": {"url": "https://www.covermymeds.health"}},
    {"input": {"index": 1, "text": "x]cmm_username[x"}},
    {"input": {"index": 2, "text": "x]cmm_password[x"}},
    {"click": {"index": 3}},
]
```

### Hours 3–5: New Request Flow

Once logged in, the agent task prompt at `agents/pa_form_filler.py:118-168` drives these steps:

1. Click "New Request" (top left corner)
2. Enter medication name: "Humira"
3. Enter patient first name ("Jane"), last name ("Doe"), DOB ("1985-03-15")
4. Enter BIN ("004336"), PCN ("ADV"), RxGroup ("RX1234")
5. Wait for matching PA forms to appear
6. Select the most appropriate form
7. Click "Start Request"

Test this flow until it works reliably. If the agent gets stuck, add more specific UI instructions to the task prompt.

### Hours 5–6: Begin Form Filling

Start filling form fields from chart data. The following fields from MRN-00421 are available:

- Patient: Jane Doe, DOB 1985-03-15 (NO address/phone — flag as gap)
- Provider: Dr. Sarah Smith, NPI 1234567890, Metro Health Rheumatology, 555-0100, fax 555-0101
- Diagnosis: M06.9 — Rheumatoid arthritis, unspecified
- Medication: Humira 40mg, Every 2 weeks, NDC 00074-4339-02

**Deliverables by Hour 6:**

- [ ] Verify: `uv run python -c "from agents.pa_form_filler import fill_covermymeds_pa; import asyncio; asyncio.run(fill_covermymeds_pa('MRN-00421'))"` — agent logs into CoverMyMeds and reaches the PA form
- [ ] Agent clicks "New Request" and enters medication + demographics
- [ ] Agent selects a PA form from the list
- [ ] Agent begins filling form fields (demographics, provider, diagnosis, medication)

---

## Phase 2 (Hours 6–12) — Complete Form + Justification

### Dependencies

- Phase 1 complete (agent can log in and reach the PA form)

### Hours 6–8: Fill All Form Fields

Complete the remaining form fields using chart data. For each field in `tools/form_mapper.py:PA_FORM_FIELDS`, the agent should:

1. Find the field on the form by label
2. Fill it with the corresponding chart value
3. If the chart has no value for a required field, add to `gaps_detected`

Specific data for clinical fields from MRN-00421:

- Prior therapies (5): Methotrexate x12wk, Sulfasalazine x8wk, PT x6wk, Ibuprofen x4wk, Methylprednisolone
- Labs: ESR 42 (elevated), CRP 3.2 (elevated), RF positive 128, Anti-CCP positive >250, TB negative, Hep B negative
- Imaging: X-ray hands (erosive changes), X-ray feet (marginal erosions)

### Hours 8–10: Clinical Justification

`tools/justification_gen.py:generate_justification()` (lines 13-74) is already implemented and returns a full narrative. Test it:

```bash
uv run python -c "
from tools.justification_gen import generate_justification
from tools.chart_loader import load_chart
chart = load_chart('MRN-00421')
print(generate_justification(chart))
"
```

Enhance it if needed — consider using the Anthropic API for richer medical writing (requires `ANTHROPIC_API_KEY` in `.env`).

The agent's `generate_justification` action at `agents/pa_form_filler.py:64-89` is a simpler version used inside the browser automation. Update its output if the form requires more detail.

**Gap detection**: In the `record_submission` action at `agents/pa_form_filler.py:93-99`, the agent records what was filled. Update the task prompt to explicitly instruct the agent to track gaps:

```
If any required information is MISSING from the chart, add to your list:
"GAP: patient_address — need from provider"
"GAP: patient_phone — need from provider"
Report all gaps in the record_submission action.
```

### Hours 10–12: End-to-End + GIF Recording

Run the full PA form fill:

```bash
uv run python scripts/run_pa.py MRN-00421
```

`generate_gif=True` is already set at `agents/pa_form_filler.py:175`. The GIF is your demo footage.

Test the golden path:

1. Login -> New Request -> Humira -> Jane Doe + Aetna
2. Select form -> Fill all fields -> Generate justification
3. Review -> Submit (or record what was filled)

**Deliverables by Hour 12:**

- [ ] Verify: `uv run python scripts/run_pa.py MRN-00421` completes without errors
- [ ] Verify: `cat output/pa_submission_MRN-00421.json` contains filled field list and justification
- [ ] Verify: GIF file exists in `output/` directory after the run
- [ ] Verify: `uv run pytest tests/test_pa_agent.py -v` passes
- [ ] Gaps flagged for any missing data (at minimum: patient_address, patient_phone)

---

## Phase 3 (Hours 12–18) — Polish + Key Flow

### Dependencies

- Phase 2 complete (full form fill works end-to-end)

### Hours 12–14: Reliability

Run `uv run python scripts/run_pa.py MRN-00421` three times. At least 2 runs should complete successfully (agent reaches `record_submission`).

If it fails:

1. Watch the browser (`headless=False` is default) — identify which step the agent gets stuck on
2. Add more specific instructions to the task prompt at `agents/pa_form_filler.py:118-168`
3. Consider adding explicit waits: "Wait 3 seconds for the form to fully load before filling fields"
4. If the agent needs more steps, increase `DEFAULT_MAX_STEPS_PA_FILLER` in `shared/constants.py` (currently 40) — but ask Dev 1 since it's a protected file
5. Reduce `max_actions_per_step` to 2 if agent clicks wrong elements

### Hours 14–16: Pharmacy-Initiated PA Flow (Nice-to-Have)

Implement `fill_covermymeds_from_key()` at `agents/pa_form_filler.py:182-212`:

1. Navigate to `https://key.covermymeds.com/`
2. Enter access key + patient last name + DOB
3. Review pre-populated form
4. Fill missing clinical info
5. Submit

### Hours 16–18: Demo GIFs

Record clean demo footage:

- Run with `generate_gif=True` on MRN-00421 (Humira/Aetna — primary demo)
- Run with MRN-00744 (Stelara — shows failed-Humira step therapy)
- Save GIFs to `output/` for demo presentation

---

## Error Handling Pattern

Use this pattern when wrapping agent runs:

```python
async def fill_covermymeds_pa(mrn: str):
    try:
        history = await agent.run(max_steps=DEFAULT_MAX_STEPS_PA_FILLER)
        if not history.is_done():
            print(f"Agent did not complete — used all {DEFAULT_MAX_STEPS_PA_FILLER} steps")
        return history
    except Exception as e:
        print(f"Agent failed for {mrn}: {e}")
        return None
```

---

## Testing Your Agent

**Standalone (no server needed):**

```bash
uv run python scripts/run_pa.py MRN-00421
```

**Watch the browser:**
The agent runs with `headless=False` by default (controlled by `BROWSER_HEADLESS` in `.env`).

**Check output:**

```bash
cat output/pa_submission_MRN-00421.json
```

**Run tests:**

```bash
uv run pytest tests/test_pa_agent.py -v
```

**Create tests** in `tests/test_pa_agent.py`:

```python
from tools.justification_gen import generate_justification
from tools.chart_loader import load_chart

def test_justification_generation():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "Humira" in narrative or "adalimumab" in narrative
    assert "M06.9" in narrative  # diagnosis code
    assert "Methotrexate" in narrative  # prior therapy

def test_chart_has_required_fields_for_pa():
    chart = load_chart("MRN-00421")
    assert chart.medication is not None
    assert chart.medication.name == "Humira"
    assert chart.insurance.bin  # BIN required for CoverMyMeds
    assert chart.insurance.pcn
    assert chart.insurance.rx_group
    assert chart.provider.npi

def test_form_mapper_has_required_fields():
    from tools.form_mapper import PA_FORM_FIELDS, NEW_REQUEST_FIELDS
    assert "medication.name" in NEW_REQUEST_FIELDS
    assert "patient.first_name" in NEW_REQUEST_FIELDS
    assert "diagnosis.icd10" in PA_FORM_FIELDS
    assert "provider.npi" in PA_FORM_FIELDS
```

## Testing With Other Components

**With FastAPI server (after Dev 1 has API live):**

```bash
# Terminal 1: start server
uv run uvicorn server.main:app --reload --port 8000

# Terminal 2: trigger via API
curl -X POST http://localhost:8000/api/pa/submit \
  -H "Content-Type: application/json" \
  -d '{"mrn": "MRN-00421", "portal": "covermymeds"}'
```

**Your input depends on Dev 2's output:**
Your `load_eligibility` action reads `output/eligibility_{mrn}.json` which Dev 2's Agent 1 writes. If that file doesn't exist, the agent proceeds without it (handled at `agents/pa_form_filler.py:57-59`).

## Portal Credentials

From `.env` — never hardcode:

- `CMM_USERNAME` / `CMM_PASSWORD` — CoverMyMeds login
- `BROWSER_USE_API_KEY` — required for `ChatBrowserUse()` LLM

## Common Issues

- **Agent can't find "New Request" button:** `use_vision=True` is already set (line 173). Be more specific in the task prompt about button location ("top left corner of dashboard")
- **Form fields load dynamically:** Add waits in the task prompt — "Wait for the form to fully load before filling fields"
- **Agent fills wrong field:** Reduce `max_actions_per_step` to 2 (edit `DEFAULT_MAX_ACTIONS_PER_STEP` in `shared/constants.py` or override in the Agent constructor). Reference field labels from `tools/form_mapper.py` in the task prompt
- **MFA blocks login:** Use `initial_actions` to script the login, or demo from an already-logged-in browser session
- **GIF not generated:** `generate_gif=True` is set at line 175. GIFs are saved to a path in `history.gif_path` — check it after the run
- **`ChatBrowserUse()` fails:** Ensure `BROWSER_USE_API_KEY` is set in `.env`

## This Is the Money Feature

If nothing else works — no frontend, no eligibility check, no status monitor — a GIF of Agent 2 filling a real CoverMyMeds PA form is still a killer demo. Prioritize making this agent reliable above all else.
