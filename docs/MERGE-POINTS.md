# Merge Points — Integration Checkpoints

All 4 developers must sync at these checkpoints. No one skips a merge point.

---

## Git Workflow at Every Merge Point

```bash
# 1. All devs push their branches
git push origin dev-X/branch-name

# 2. Dev 1 merges first (owns shared contracts)
git checkout main && git pull
git merge dev-1/infrastructure
git push origin main

# 3. Dev 2 rebases and merges
git checkout dev-2/agents && git rebase main
# Resolve any conflicts, then:
git checkout main && git merge dev-2/agents
git push origin main

# 4. Dev 3 rebases and merges
git checkout dev-3/pa-filler && git rebase main
git checkout main && git merge dev-3/pa-filler
git push origin main

# 5. Dev 4 rebases and merges
git checkout dev-4/frontend && git rebase main
git checkout main && git merge dev-4/frontend
git push origin main

# 6. All devs pull new main and create fresh branches
git checkout main && git pull
git checkout -b dev-X/phase-N
```

Merge order matters — Dev 1 goes first because they own the shared contracts.

**If a merge breaks tests:** `git revert <merge-commit>` to undo the merge cleanly. Do NOT force-push to main. Fix the issue on the dev branch and re-merge.

---

## Merge Point 1 — Hour 6 — Stubs Connected (30 min)

### Agenda

1. Each dev demos what they have (3 min each, 12 min total)
2. Merge all branches to `main` (follow git workflow above)
3. Run integration checks
4. Quick standup: blockers, priorities for next 6 hours

### Integration Checks

Run these from `main` after all branches are merged. Run each independently — don't chain with `&&` so one failure doesn't block the rest:

```bash
# Check 1: Python imports work across boundaries
uv run python -c "from shared.models import EligibilityResult, PARequest, AgentRun; print('Models OK')"

# Check 2: Chart fixtures load and validate
uv run python -c "
from tools.chart_loader import load_chart, list_available_charts
for mrn in list_available_charts():
    chart = load_chart(mrn)
    print(f'{mrn}: {chart.patient.name} - {chart.insurance.payer}')
print('Charts OK')
"

# Check 3: Tests pass
uv run pytest -v

# Check 4: FastAPI server starts and returns data
# Start in background, test, then stop
uv run python -c "
import httpx, subprocess, time, sys
proc = subprocess.Popen(['uv', 'run', 'uvicorn', 'server.main:app', '--port', '8000'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)
try:
    r = httpx.get('http://localhost:8000/api/health')
    assert r.status_code == 200, f'Health check failed: {r.status_code}'
    r = httpx.get('http://localhost:8000/api/patients')
    assert r.status_code == 200, f'Patients failed: {r.status_code}'
    print(f'API OK - {len(r.json())} patients returned')
finally:
    proc.terminate()
    proc.wait()
"

# Check 5: Frontend builds
cd frontend && npm run build && cd ..
```

### Pass/Fail Criteria

- [ ] `shared/models` importable from `agents/`, `tools/`, `server/`
- [ ] FastAPI returns patient data on `GET /api/patients`
- [ ] `uv run pytest` passes all tests
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Dev 2's agent can load chart data: `uv run python -c "from tools.chart_loader import load_chart; print(load_chart('MRN-00421').patient.name)"`
- [ ] Dev 3's agent skeleton imports without errors: `uv run python -c "from agents.pa_form_filler import fill_covermymeds_pa; print('PA agent OK')"`

### Decision Point

**If Convex Python integration is proving difficult:**
Pivot to simpler approach — agents write to local JSON files in `output/`, FastAPI reads files, Convex used only on the frontend side. Dev 1 makes this call.

### After Merge

```bash
git tag v0.1-stubs-connected
```

Each dev creates a new branch for Phase 2.

---

## Merge Point 2 — Hour 12 — Core Features (45-60 min)

**This is the most important merge point.** Isolated features must connect into a working pipeline.

### Agenda

1. All devs merge to `main` (follow git workflow above)
2. Run end-to-end integration tests (below)
3. Fix type mismatches or API contract violations on the spot
4. Priority triage: what works, what's broken, what to cut

### End-to-End Integration Tests

Run sequentially — each test depends on the previous:

**Test 1 — Data Flow:**

```bash
# Start server, upload a chart, verify it's returned
uv run uvicorn server.main:app --port 8000 &
SERVER_PID=$!
sleep 3

curl -s -X POST http://localhost:8000/api/patients \
  -H "Content-Type: application/json" \
  -d @data/charts/MRN-00421.json | python -m json.tool

curl -s http://localhost:8000/api/patients/MRN-00421 | python -m json.tool
```

**Test 2 — Eligibility Pipeline:**

```bash
# Trigger eligibility check via API, verify run_id returned
curl -s -X POST http://localhost:8000/api/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"mrn": "MRN-00421", "portal": "stedi"}' | python -m json.tool
```

**Test 3 — PA Pipeline:**

```bash
# Trigger PA submission via API
curl -s -X POST http://localhost:8000/api/pa/submit \
  -H "Content-Type: application/json" \
  -d '{"mrn": "MRN-00421", "portal": "covermymeds"}' | python -m json.tool
```

**Test 4 — Agent Activity:**

```bash
# Check agent runs are tracked
curl -s http://localhost:8000/api/agents/runs | python -m json.tool

# Clean up
kill $SERVER_PID 2>/dev/null
```

**Test 5 — Frontend renders with live backend:**

```bash
# In another terminal:
cd frontend && npm run dev
# Open http://localhost:3000 and verify pages show data
```

### If Integration Breaks

| Break Point | Who Fixes | Others Do |
|-------------|-----------|-----------|
| API returns wrong shape | Dev 1 | Continue feature work |
| Agent output doesn't match `shared/models.py` | Dev 1 + Dev 2/3 pair | Dev 4 continues frontend |
| Frontend can't parse API response | Dev 4 + Dev 1 pair | Dev 2/3 continue agents |
| Agent fails to launch | Dev 2/3 | Dev 1/4 continue |

### Fallback

If full integration isn't achievable by Hour 12:

- Each agent runs standalone via `scripts/run_*.py`
- Frontend shows fixture data from the API stubs
- Integration moves to Phase 3

### After Merge

```bash
git tag v0.2-core-features
```

---

## Merge Point 3 — Hour 18 — Full Pipeline (60 min)

### Agenda

1. All devs merge to `main`
2. Run the demo golden path end-to-end
3. Make cut/keep decisions for the final demo
4. Assign demo prep tasks

### Demo Golden Path

Run through the exact demo scenario:

```
1. Open dashboard at http://localhost:3000
2. Paste MRN-00421 chart JSON (Humira PA for Jane Doe)
3. Click "Check Eligibility"
4. Watch Agent 1 navigate Stedi test mode
5. See eligibility result: "Coverage Active — PA Required for Humira"
6. Click "Submit PA"
7. Watch Agent 2 navigate CoverMyMeds
8. See PA request status: "Submitted"
9. Trigger status check
10. Watch Agent 3 check CoverMyMeds dashboard
11. See status update: "Approved" or "Pending"
12. See alert notification
```

Run this 3 times. It should succeed at least 2/3 times.

### Cut/Keep Decision Matrix

| Feature | Working? | Decision |
|---------|----------|----------|
| CoverMyMeds PA form filler (Agent 2) + GIF | | **MUST WORK** — core demo |
| Stedi eligibility check (Agent 1) | | MUST WORK — shows multi-portal |
| Frontend dashboard with real-time updates | | MUST WORK — visual impact |
| Status monitor (Agent 3) | | Nice to have — can demo manually |
| Claim.MD integration | | Bonus — cut if needed |
| Pharmacy-initiated PA flow | | Bonus — cut if needed |
| Agentmail alerts | | Nice to have — console logs OK |
| Mock portal | | Only if CoverMyMeds is blocked |

### After Merge

```bash
git tag v0.3-integrated
```

---

## Final Merge — Hour 22 — Demo Ready

### Checklist

- [ ] All code on `main`
- [ ] Golden path demo works 2/3 times
- [ ] GIF recordings saved in `output/`
- [ ] Backup demo video recorded
- [ ] Demo script written
- [ ] Slides prepared (if applicable)

```bash
git tag v1.0-demo
```

---

## Emergency Fallback — Minimum Viable Demo

If at Hour 18 full integration is not achievable:

1. **Terminal-based demo** (no frontend needed):

   ```bash
   uv run python scripts/run_full_flow.py MRN-00421
   ```

2. Show Agent 2 navigating CoverMyMeds via `generate_gif=True` recording
3. Show eligibility + PA results as JSON in terminal
4. **This alone is compelling** — an AI agent filling a real PA form on the portal 950K providers use daily

Required for minimum demo:

- [x] Mock chart fixture (`data/charts/MRN-00421.json`)
- [ ] Agent 2 (CoverMyMeds PA form filler) with GIF
- [x] Clinical justification generator
- [x] Terminal orchestration script
