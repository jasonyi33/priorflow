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

### Hour 2–3: Agent Skeleton + Chart Loader

Your agent skeleton is already in `agents/eligibility_checker.py`. Start by:

1. Testing that chart loading works:
   ```python
   from agents.base import load_chart
   chart = load_chart("MRN-00421")
   print(chart["patient"]["name"])  # Jane Doe
   ```

2. Testing that Browser Use launches:
   ```python
   from browser_use import Agent, Browser, ChatBrowserUse
   browser = Browser(headless=False)
   agent = Agent(task="Go to google.com", llm=ChatBrowserUse(), browser=browser)
   await agent.run(max_steps=3)
   ```

3. Writing a basic test in `tests/test_eligibility_agent.py`:
   ```python
   def test_chart_loads_for_all_fixtures():
       from tools.chart_loader import load_chart, list_available_charts
       for mrn in list_available_charts():
           chart = load_chart(mrn)
           assert chart.insurance.payer  # has a payer
   ```

### Hour 3–5: Stedi Test Mode Flow

Navigate Stedi's eligibility check UI. The agent task prompt is already written — your job is to test and iterate on it.

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

**Tips:**
- Use `use_vision=True` — Stedi's UI is dynamic and vision helps the agent navigate
- Start with `headless=False` so you can watch the agent work
- Test with MRN-00421 (Aetna) first — Stedi has predefined mock data for Aetna
- If Stedi requires specific test subscriber data in test mode, use those values instead of chart values
- Use `max_actions_per_step=3` to prevent the agent from doing too many things at once

### Hour 5–6: Validate Output Schema

After the agent completes, validate its output:
```python
from shared.models import EligibilityResult, Portal
from datetime import datetime, UTC

result = EligibilityResult(
    mrn="MRN-00421",
    portal=Portal.STEDI,
    payer="Aetna",
    coverage_active=True,
    pa_required=True,
    pa_required_reason="Specialty medication",
    checked_at=datetime.now(UTC),
)
# This must not throw — if it does, the agent output is wrong
```

Save output to `output/eligibility_MRN-00421.json` — Agent 2 (Dev 3) reads this file.

**Deliverables by Hour 6:**
- [ ] Agent launches browser and navigates to Stedi
- [ ] Agent can toggle test mode ON
- [ ] Agent fills eligibility form with chart data
- [ ] Output saved as JSON matching `EligibilityResult` schema
- [ ] Test in `tests/test_eligibility_agent.py` validates chart loading

---

## Phase 2 (Hours 6–12) — Complete Eligibility + Start Monitor

### Hours 6–8: Polish Stedi Agent + API Integration

- Make the Stedi agent reliable — run it 3 times, it should succeed 2+ times
- Integrate with `tools/db_client.py` to save results through the API (not just local files)
- After Dev 1 has the API working, call `save_eligibility_result()` from `tools/db_client.py`

### Hours 8–10: Claim.MD Eligibility Agent

Implement `check_eligibility_claimmd()` in `agents/eligibility_checker.py`.

**Claim.MD test account behavior:**
- Generates rejections/denials based on the insured ID entered
- Returns sample eligibility data for any input
- Different member IDs produce different responses — document which IDs give which outcomes

The agent task prompt is already written. Test with MRN-00421.

### Hours 10–12: Agent 3 Skeleton (Status Monitor)

Start implementing `agents/status_monitor.py`:
1. Agent logs into CoverMyMeds
2. Finds PA request for a patient on the dashboard
3. Reads current status (Pending/Approved/Denied)
4. Calls `update_status` action to save
5. Calls `send_alert` if status changed

Start with `monitor_covermymeds()` — the `monitor_claimmd()` variant is nice-to-have.

**Deliverables by Hour 12:**
- [ ] Stedi agent works reliably (2/3 success rate)
- [ ] Results saved via API (or local JSON fallback)
- [ ] Claim.MD agent runs against test account
- [ ] Status monitor agent can log into CoverMyMeds and read dashboard

---

## Phase 3 (Hours 12–18) — Polish + Alerting

- Complete Agent 3 (status monitor) — detect status changes, send alerts
- Implement `tools/alert_sender.py` with real Agentmail API (or keep as console log for demo)
- Test eligibility with all 5 patient fixtures (MRN-00421 through MRN-00855)
- Build helper: `build_approval_alert()`, `build_denial_alert()`, `build_delay_alert()`

---

## Testing Your Agents

**Standalone (no server needed):**
```bash
uv run python scripts/run_eligibility.py MRN-00421
```

**Watch the browser:**
Set `headless=False` in `agents/base.py` `get_browser_config()` (or set `BROWSER_HEADLESS=false` in `.env`).

**Check output:**
```bash
cat output/eligibility_MRN-00421.json
```

## Portal Credentials

All credentials come from `.env` — never hardcode them:
- `STEDI_API_KEY` — for Stedi login
- `CLAIMMD_USERNAME` / `CLAIMMD_PASSWORD` — for Claim.MD test account
- `CMM_USERNAME` / `CMM_PASSWORD` — for CoverMyMeds (Agent 3 monitoring)
- `BROWSER_USE_API_KEY` — required for `ChatBrowserUse()` LLM

## Common Issues

- **Agent gets stuck on login:** Use `initial_actions` to pre-script the login flow (navigate + fill + click) so the LLM starts from an authenticated state
- **Agent clicks wrong element:** Add more specific instructions in the task prompt, or use `max_actions_per_step=2` to slow it down
- **Stedi test mode uses predefined data:** In test mode, Stedi may require specific mock subscriber names/DOBs. Check what Stedi provides and use those values
- **Output doesn't match schema:** Always construct an `EligibilityResult` from the agent's extracted data before saving, so Pydantic validates it
