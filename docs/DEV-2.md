# Dev 2 — Agent Engineer (Eligibility + Status Monitor)

## Your Mission

Build Agent 1 (eligibility checking via Stedi and Claim.MD test portals) and Agent 3 (status monitoring across portals with alerting).

## Your Files

```
agents/eligibility_checker.py   # Agent 1 — your primary deliverable
agents/status_monitor.py        # Agent 3 — secondary deliverable
tools/chart_loader.py           # Load mock EMR data for agents
tools/eligibility_parser.py     # Parse raw portal responses into EligibilityResult
tools/alert_sender.py           # Agentmail integration for status alerts
tests/test_eligibility_agent.py # You create this
```

**Do NOT modify:** `shared/models.py`, `convex/schema.ts`, `server/`, `frontend/`
If you need a new field on `EligibilityResult` or `AgentRun`, ask Dev 1.

## Branch

```
git checkout -b dev-2/agents
```

---

## Important: Data Types

There are **two** chart loading functions — know which to use where:

| Function | Returns | Use when |
|----------|---------|----------|
| `tools.chart_loader.load_chart(mrn)` | `PatientChart` (Pydantic object) | Tests, scripts, standalone code. Access fields via `chart.patient.name`, `chart.insurance.payer` |
| `agents.base.load_chart(mrn)` | `dict` (raw JSON) | Inside `@tools.action` functions for Browser Use agents. Access fields via `chart['patient']['name']` |

The `@tools.action` functions in agent skeletons use `agents.base.load_chart()` (returns dict, then `json.dumps()` it for the LLM). Your tests and scripts should use `tools.chart_loader.load_chart()` (returns validated Pydantic).

---

## Key Data Contracts

Your agents MUST output data conforming to these models (defined in `shared/models.py`):

**Agent 1 output — `EligibilityResult`:**
```python
EligibilityResult(
    mrn="MRN-00421",
    portal=Portal.STEDI,       # or Portal.CLAIMMD
    payer="Aetna",
    coverage_active=True,
    copay="$30 specialist",
    deductible="$1,500 individual",
    out_of_pocket_max="$6,000",
    pa_required=True,
    pa_required_reason="Specialty medication requires PA",
    raw_response="...",        # optional, full portal response text
    checked_at=datetime.now(UTC),
)
```

**Agent 3 output — `PAStatusUpdate`:**
```python
PAStatusUpdate(
    request_id="pa-001",
    mrn="MRN-00421",
    portal=Portal.COVERMYMEDS,
    status=PAStatusEnum.APPROVED,  # or DENIED, PENDING, MORE_INFO_NEEDED
    determination_date="2026-02-28",
    denial_reason=None,            # populated if DENIED
    notes="Approved for 12 months",
    checked_at=datetime.now(UTC),
)
```

---

## Phase 1 (Hours 2–6) — Stedi Eligibility Agent

### Dependencies
- `.env` file with `BROWSER_USE_API_KEY` and `STEDI_API_KEY` filled in
- `uv pip install -e ".[dev]"` completed
- All 5 chart fixtures exist in `data/charts/` (already done in Phase 0)

### Hour 2–3: Agent Skeleton + Chart Loader

Your agent skeleton is already in `agents/eligibility_checker.py` (lines 53-99 for Stedi, lines 102-141 for Claim.MD). Start by:

1. Verify chart loading works (use `tools.chart_loader` for tests, NOT `agents.base`):
   ```python
   from tools.chart_loader import load_chart
   chart = load_chart("MRN-00421")
   print(chart.patient.name)      # Jane Doe (Pydantic attribute access)
   print(chart.insurance.payer)   # Aetna
   ```

2. Verify Browser Use launches:
   ```python
   from browser_use import Agent, Browser, ChatBrowserUse
   browser = Browser(headless=False)
   agent = Agent(task="Go to google.com", llm=ChatBrowserUse(), browser=browser)
   await agent.run(max_steps=3)
   ```

3. Write a test in `tests/test_eligibility_agent.py`:
   ```python
   from tools.chart_loader import load_chart, list_available_charts

   def test_chart_loads_for_all_fixtures():
       for mrn in list_available_charts():
           chart = load_chart(mrn)
           assert chart.insurance.payer  # has a payer

   def test_eligibility_result_schema():
       from shared.models import EligibilityResult, Portal
       from datetime import datetime, UTC
       result = EligibilityResult(
           mrn="MRN-00421", portal=Portal.STEDI, payer="Aetna",
           coverage_active=True, pa_required=True,
           pa_required_reason="Specialty medication",
           checked_at=datetime.now(UTC),
       )
       assert result.mrn == "MRN-00421"
   ```

### Hour 3–5: Stedi Test Mode Flow

The agent task prompt is in `agents/eligibility_checker.py:69-89`. Your job is to test it against Stedi and iterate on the prompt until it works.

**What the agent does step-by-step:**
1. Navigate to `https://www.stedi.com` and log in
2. Toggle "Test mode" ON (look for the toggle in the UI)
3. Click to create a new eligibility check
4. Select payer matching patient's insurance (Aetna, BCBS, UHC, or Medicare)
5. Fill provider info (name, NPI from chart)
6. Fill subscriber info (name, DOB, member ID)
7. Submit the check
8. Parse the response — extract coverage, copay, deductible, PA requirements
9. Save result via `save_eligibility` action

**Stedi Test Mode Data:**
In test mode, Stedi provides predefined mock subscriber data per payer. If the portal requires specific test values instead of chart data, use these. Check the Stedi eligibility check UI — when you select a payer in test mode, it may pre-populate or suggest mock subscriber info. Document any test-specific values you find here for other devs.

**Tips:**
- `use_vision=True` is already set in the skeleton — Stedi's UI is dynamic
- Start with `headless=False` (default in `.env` `BROWSER_HEADLESS=false`)
- Test with MRN-00421 (Aetna) first
- `max_actions_per_step=3` is set via `DEFAULT_MAX_ACTIONS_PER_STEP` from `shared/constants.py`

### Hour 5–6: Validate Output and Persist

After the agent completes, the `save_eligibility` action in `agents/eligibility_checker.py:43-50` saves to `output/eligibility_{mrn}.json`.

For validated persistence (goes through Pydantic), update the agent to use `tools/db_client.py`:
```python
from tools.db_client import save_eligibility_result
from shared.models import EligibilityResult, Portal
from datetime import datetime, UTC

result = EligibilityResult(
    mrn="MRN-00421", portal=Portal.STEDI, payer="Aetna",
    coverage_active=True, pa_required=True,
    pa_required_reason="Specialty medication",
    checked_at=datetime.now(UTC),
)
await save_eligibility_result(result)
# Saves to: output/eligibility_MRN-00421.json
```

This file is read by Agent 2 (Dev 3) via `agents/pa_form_filler.py:49-60`.

**Deliverables by Hour 6:**
- [ ] `uv run pytest tests/test_eligibility_agent.py` passes
- [ ] `uv run python scripts/run_eligibility.py MRN-00421` launches browser and navigates to Stedi
- [ ] Agent toggles test mode ON and fills eligibility form
- [ ] `output/eligibility_MRN-00421.json` exists and is valid JSON after a run

---

## Phase 2 (Hours 6–12) — Complete Eligibility + Start Monitor

### Dependencies
- Phase 1 complete (Stedi agent runs end-to-end)
- Dev 1's API at `POST /api/eligibility/check` accepts requests (for API integration)

### Hours 6–8: Stedi Agent Reliability + API Integration

**Reliability target**: Run `uv run python scripts/run_eligibility.py MRN-00421` three times. At least 2 runs should complete successfully (agent reaches `save_eligibility` action).

If the agent fails:
1. Check which step it gets stuck on (watch browser with `headless=False`)
2. Add more specific instructions to the task prompt in `agents/eligibility_checker.py:69-89`
3. Consider adding `initial_actions` for the login flow to skip LLM-driven login
4. Reduce `max_actions_per_step` to 2 if agent clicks wrong elements

**API integration**: Once Dev 1's API is live, update `tools/db_client.py:save_eligibility_result()` to call `POST /api/eligibility/check` instead of writing local files. For now, file-based fallback works.

### Hours 8–10: Claim.MD Eligibility Agent

Implement `check_eligibility_claimmd()` — the skeleton is at `agents/eligibility_checker.py:102-141`.

**Claim.MD test account behavior:**
- Login with `CLAIMMD_USERNAME` / `CLAIMMD_PASSWORD` from `.env`
- Generates rejections/denials based on the insured ID value entered
- Returns sample eligibility data regardless of input
- Document which member IDs produce which outcomes in a comment in the agent file

Update `tools/eligibility_parser.py:parse_claimmd_response()` (lines 35-53) with actual response parsing once you see the Claim.MD response format.

### Hours 10–12: Agent 3 Skeleton (Status Monitor)

File: `agents/status_monitor.py`. This agent needs CoverMyMeds credentials (`CMM_USERNAME`/`CMM_PASSWORD` in `.env` — same as Dev 3 uses).

1. Agent logs into CoverMyMeds at `https://www.covermymeds.health`
2. Finds PA request for a patient on the dashboard
3. Reads current status (Pending/Approved/Denied)
4. Calls `update_status` action to save to `output/status_{mrn}.json`
5. Calls `send_alert` action (currently prints to console via `tools/alert_sender.py`)

Start with `monitor_covermymeds()` — the `monitor_claimmd()` variant is nice-to-have.

**Deliverables by Hour 12:**
- [ ] `uv run python scripts/run_eligibility.py MRN-00421` succeeds 2/3 times
- [ ] `output/eligibility_MRN-00421.json` contains valid `EligibilityResult` fields
- [ ] Claim.MD agent runs: `uv run python -c "from agents.eligibility_checker import check_eligibility_claimmd; import asyncio; asyncio.run(check_eligibility_claimmd('MRN-00421'))"`
- [ ] Status monitor can log into CoverMyMeds: `uv run python -c "from agents.status_monitor import monitor_covermymeds; import asyncio; asyncio.run(monitor_covermymeds('MRN-00421', 'Jane Doe'))"`

---

## Phase 3 (Hours 12–18) — Polish + Alerting

### Dependencies
- Phase 2 complete (both eligibility agents working)
- Dev 3 has submitted at least one PA via CoverMyMeds (so Agent 3 has something to monitor)

### Tasks

1. **Complete Agent 3** in `agents/status_monitor.py` — detect status changes, send alerts
2. **Implement Agentmail** in `tools/alert_sender.py:send_pa_alert()` (lines 12-24):
   - Replace `print()` with real Agentmail API call using `AGENTMAIL_API_KEY` from `.env`
   - If Agentmail isn't set up, keep console logging — it's fine for demo
3. **Test all 5 fixtures**: Run eligibility for MRN-00421 through MRN-00855
4. **Alert builders** in `tools/alert_sender.py` are already implemented (lines 27-63): `build_approval_alert()`, `build_denial_alert()`, `build_delay_alert()` — verify they work

---

## Error Handling Pattern

Use this pattern in all agent wrapper functions:

```python
async def check_eligibility_stedi(mrn: str):
    try:
        history = await agent.run(max_steps=DEFAULT_MAX_STEPS_ELIGIBILITY)
        if not history.is_done():
            print(f"Agent did not complete — used all {DEFAULT_MAX_STEPS_ELIGIBILITY} steps")
            return None
        return history.final_result()
    except Exception as e:
        print(f"Agent failed for {mrn}: {e}")
        return None
```

---

## Testing Your Agents

**Standalone (no server needed):**
```bash
uv run python scripts/run_eligibility.py MRN-00421
```

**Watch the browser:**
Set `BROWSER_HEADLESS=false` in `.env` (default). Controlled by `agents/base.py:get_browser_config()`.

**Check output:**
```bash
cat output/eligibility_MRN-00421.json
```

**Run tests:**
```bash
uv run pytest tests/test_eligibility_agent.py -v
```

## Testing With Other Components

**With FastAPI server (after Dev 1 has API live):**
```bash
# Terminal 1: start server
uv run uvicorn server.main:app --reload --port 8000

# Terminal 2: trigger via API
curl -X POST http://localhost:8000/api/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"mrn": "MRN-00421", "portal": "stedi"}'
```

**Your output feeds into Dev 3's agent:**
Agent 2 reads `output/eligibility_{mrn}.json` at `agents/pa_form_filler.py:49-60`. Ensure this file contains valid JSON after each eligibility run.

## Portal Credentials

All credentials come from `.env` — never hardcode them:
- `BROWSER_USE_API_KEY` — required for `ChatBrowserUse()` LLM
- `STEDI_API_KEY` — for Stedi login
- `CLAIMMD_USERNAME` / `CLAIMMD_PASSWORD` — for Claim.MD test account
- `CMM_USERNAME` / `CMM_PASSWORD` — for CoverMyMeds (Agent 3 monitoring, shared with Dev 3)

## Common Issues

- **Agent gets stuck on login:** Use `initial_actions` in the Agent constructor to pre-script the login flow (navigate + fill + click) so the LLM starts from an authenticated state. See `agents/pa_form_filler.py:116-127` for the pattern with `sensitive_data`.
- **Agent clicks wrong element:** Add more specific instructions in the task prompt at `agents/eligibility_checker.py:69-89`, or reduce `max_actions_per_step` to 2
- **Stedi test mode uses predefined data:** In test mode, Stedi may require specific mock subscriber names/DOBs. Use those values instead of chart data, and document them in a comment
- **Output doesn't match schema:** Always construct an `EligibilityResult` from the agent's extracted data before saving. Use `tools/eligibility_parser.py:parse_stedi_response()` to wrap raw output in validated Pydantic
- **`ChatBrowserUse()` fails:** Ensure `BROWSER_USE_API_KEY` is set in `.env`. This is the LLM that drives browser automation — without it, agents can't reason about what they see
