# Dev 1 — Infrastructure Architect

## Your Mission

Build the shared foundation that unblocks all other developers, then build the FastAPI orchestration server that dispatches Browser Use agents and serves data to the frontend.

## Your Files

You own these directories — no other dev should modify them without asking you:

```
shared/models.py          # PROTECTED — all Pydantic data contracts
shared/constants.py        # PROTECTED — portal URLs, timeouts, config
convex/schema.ts           # PROTECTED — database schema
server/                    # FastAPI app, routes, services
data/                      # Mock chart fixtures + sample outputs
scripts/                   # Dev startup, seed data, runner scripts
agents/base.py             # Shared agent utilities
tools/db_client.py         # Agent-to-API bridge
tests/conftest.py          # Test fixtures
tests/test_models.py       # Model validation tests
tests/test_api.py          # API route tests (you create this)
pyproject.toml             # Python dependencies
.env.example               # Environment variable template
```

## Branch

```
git checkout -b dev-1/infrastructure
```

---

## Phase 0 (Hours 0–2) — DONE

Phase 0 is already committed to `main`. The foundation is in place:
- `shared/models.py` with 15 Pydantic models
- `convex/schema.ts` with 5 tables
- FastAPI stub routes returning fixture data
- 5 mock chart fixtures
- CI/CD pipeline

---

## Phase 1 (Hours 2–6) — Backend Foundation

### Hour 2–3: Convex Mutations & Queries

Create server-side Convex functions for all 5 tables.

**Files to create:**
- `convex/patients.ts` — `list`, `getByMrn`, `create`
- `convex/eligibilityChecks.ts` — `list`, `getByMrn`, `create`
- `convex/paRequests.ts` — `list`, `getByMrn`, `getByStatus`, `create`, `updateStatus`
- `convex/agentRuns.ts` — `list`, `getByMrn`, `create`, `complete`
- `convex/alerts.ts` — `list`, `getByMrn`, `create`

Each file follows the same pattern:
```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({ handler: async (ctx) => ctx.db.query("patients").collect() });

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) => ctx.db.query("patients").withIndex("by_mrn", q => q.eq("mrn", args.mrn)).first(),
});

export const create = mutation({
  args: { /* fields from schema */ },
  handler: async (ctx, args) => ctx.db.insert("patients", args),
});
```

### Hour 3–4: Convex HTTP Client

Implement `server/services/convex_client.py` — the Python wrapper that calls Convex HTTP API so FastAPI routes can read/write Convex data.

```python
# Key methods to implement:
async def query(self, function_name: str, args: dict) -> Any
async def mutation(self, function_name: str, args: dict) -> Any
```

Reference: https://docs.convex.dev/http-api/

Then replace the stub routes in `server/routes/*.py` to use `convex_client` instead of reading fixture files.

### Hour 4–5: Agent Dispatch Logic

Implement `server/services/orchestrator.py`:

```python
async def dispatch_eligibility(mrn: str, portal: Portal) -> str:
    # 1. Create AgentRun record in Convex (status: started)
    # 2. Spawn asyncio.create_task() that runs the eligibility agent
    # 3. In the task: on completion, update AgentRun + write EligibilityResult
    # 4. Return run_id immediately
```

Wire up `POST /api/eligibility/check` to call `dispatch_eligibility()`.

### Hour 5–6: Seed Script + API Test

- Implement `scripts/seed_data.py` — populates Convex with data from `data/fixtures/`
- Create `tests/test_api.py` — test each route returns correct shapes
- Verify round-trip: seed data -> API returns it -> matches fixture

**Deliverables by Hour 6:**
- [ ] Convex mutations/queries for all 5 tables
- [ ] FastAPI routes return real Convex data (not fixture files)
- [ ] `POST /api/eligibility/check` spawns a background task
- [ ] Seed script populates Convex
- [ ] API tests pass

---

## Phase 2 (Hours 6–12) — Orchestration

### Hours 6–8: Background Task Management

- Agent dispatch creates `agentRuns` doc at start, updates on completion
- Track running tasks in memory (dict of `run_id -> asyncio.Task`)
- Add `GET /api/agents/runs/{run_id}` for polling task status

### Hours 8–10: Flow Chaining

Implement `dispatch_full_flow(mrn)`:
1. Run eligibility check, await result
2. If `pa_required == True`, dispatch PA form filler
3. After PA submission, start status monitoring

### Hours 10–12: Error Handling

- Wrap agent dispatch in try/except — on failure, update `agentRuns` with error
- Add retry logic: `max_retries=3` with exponential backoff
- Add timeout: cancel agent task after `AGENT_RUN_TIMEOUT` (5 min)

**Deliverables by Hour 12:**
- [ ] Full flow chaining works: eligibility -> PA -> status
- [ ] Agent runs tracked in Convex with start/complete/error states
- [ ] Error handling doesn't crash the server

---

## Phase 3 (Hours 12–18) — Integration + Notifications

- Fix any integration issues from Merge Point 2
- Implement `server/services/notification.py` with real Agentmail API
- Harden API error responses (proper HTTP status codes)
- Help other devs debug integration issues (you own the glue layer)

---

## Key Decisions You Own

1. **Convex vs file-based fallback** — If Convex Python HTTP client is too slow or unreliable, pivot to agents writing local JSON + FastAPI reading files. Frontend keeps Convex for real-time via Next.js.
2. **Agent execution model** — Agents run as `asyncio.create_task()` in the FastAPI process. No separate workers or queues needed for hackathon scope.
3. **Schema changes** — You are the ONLY person who modifies `shared/models.py` and `convex/schema.ts`. Other devs ask you. Always add new fields as `Optional` with defaults.

## API Contract Reference

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `GET` | `/api/patients` | — | `list[PatientChart]` |
| `GET` | `/api/patients/{mrn}` | — | `PatientChart` |
| `POST` | `/api/patients` | `PatientChart` | `APIResponse` |
| `POST` | `/api/eligibility/check` | `{mrn, portal}` | `APIResponse` (run_id) |
| `GET` | `/api/eligibility/{mrn}` | — | `list[EligibilityResult]` |
| `POST` | `/api/pa/submit` | `{mrn, portal}` | `APIResponse` (run_id) |
| `GET` | `/api/pa` | `?mrn=&status=` | `list[PARequest]` |
| `GET` | `/api/pa/{request_id}` | — | `PARequest` |
| `POST` | `/api/pa/status/check` | `{mrn}` | `APIResponse` (run_id) |
| `GET` | `/api/agents/runs` | `?mrn=&type=` | `list[AgentRun]` |
| `GET` | `/api/health` | — | `{status: "ok"}` |
