# Merge Points — Integration Checkpoints

All 4 developers must sync at these checkpoints. No one skips a merge point.

---

## Git Workflow at Every Merge Point

```
1. All devs push their branches
2. Dev 1 merges dev-1/infrastructure → main (foundation goes first)
3. Dev 2 rebases dev-2/agents on new main, resolves conflicts, merges
4. Dev 3 rebases dev-3/pa-filler on new main, resolves conflicts, merges
5. Dev 4 rebases dev-4/frontend on new main, resolves conflicts, merges
6. All devs pull new main and create fresh branches for next phase
```

Merge order matters — Dev 1 goes first because they own the shared contracts.

---

## Merge Point 1 — Hour 6 — Stubs Connected (30 min)

### Agenda
1. Each dev demos what they have (3 min each, 12 min total)
2. Merge all branches to `main` (follow git workflow above)
3. Run integration checks
4. Quick standup: blockers, priorities for next 6 hours

### Integration Checks

Run these from `main` after all branches are merged:

```bash
# 1. Python imports work across boundaries
uv run python -c "from shared.models import EligibilityResult; print('OK')"

# 2. FastAPI server starts and returns data
uv run uvicorn server.main:app --port 8000 &
sleep 2
curl http://localhost:8000/api/patients | python -m json.tool
curl http://localhost:8000/api/health
kill %1

# 3. Tests pass
uv run pytest -v

# 4. Frontend builds
cd frontend && npm run build && cd ..

# 5. Chart fixtures load
uv run python -c "
from tools.chart_loader import load_chart, list_available_charts
for mrn in list_available_charts():
    chart = load_chart(mrn)
    print(f'{mrn}: {chart.patient.name} - {chart.insurance.payer}')
"
```

### Pass/Fail Criteria

- [ ] `shared/models` importable from `agents/`, `tools/`, `server/`
- [ ] FastAPI returns patient data on `GET /api/patients`
- [ ] Frontend builds without errors
- [ ] Dev 2's agent can launch a browser and load chart data
- [ ] Dev 3's agent can launch a browser and reach CoverMyMeds login

### Decision Point

**If Convex Python integration is proving difficult:**
Pivot to simpler approach — agents write to local JSON files, FastAPI reads files, Convex used only on the frontend side. Dev 1 makes this call.

### After Merge

```bash
git tag v0.1-stubs-connected
```

Each dev creates a new branch for Phase 2.

---

## Merge Point 2 — Hour 12 — Core Features (45-60 min)

**This is the most important merge point.** Isolated features must connect into a working pipeline.

### Agenda
1. All devs merge to `main`
2. Run end-to-end integration tests (below)
3. Fix type mismatches or API contract violations on the spot
4. Priority triage: what works, what's broken, what to cut

### End-to-End Integration Tests

Run sequentially — each test depends on the previous:

**Test 1 — Data Flow:**
```
Frontend: paste chart JSON → POST /api/patients → patient appears in data store → frontend patient list updates
```

**Test 2 — Eligibility Pipeline:**
```
Click "Check Eligibility" → POST /api/eligibility/check → backend dispatches Agent 1
→ Agent runs Stedi check → result saved → frontend eligibility view updates
```

**Test 3 — PA Pipeline:**
```
Click "Submit PA" → POST /api/pa/submit → backend dispatches Agent 2
→ Agent fills CoverMyMeds form → PA record saved → frontend PA list updates
```

**Test 4 — Agent Activity:**
```
During any agent run → agent-activity page shows real-time progress
```

### If Integration Breaks

| Break Point | Who Fixes | Others Do |
|-------------|-----------|-----------|
| API ↔ Convex | Dev 1 | Continue feature work |
| Agent ↔ API | Dev 1 + Dev 2/3 pair | Dev 4 continues frontend |
| Frontend ↔ API | Dev 4 + Dev 1 pair | Dev 2/3 continue agents |

### Fallback

If full integration isn't achievable by Hour 12:
- Each agent runs standalone via `scripts/run_*.py`
- Frontend shows Convex-seeded data only
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
5. See eligibility result: "Coverage Active ✓ — PA Required for Humira ⚠"
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
