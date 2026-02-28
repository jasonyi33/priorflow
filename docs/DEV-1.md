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

```bash
git checkout -b dev-1/infrastructure
```

---

## Phase 0 (Hours 0–2) — DONE

Phase 0 is already committed to `main`. The foundation is in place:

- `shared/models.py` with 15 Pydantic models (enums: `Portal`, `PAStatusEnum`, `AgentType`)
- `convex/schema.ts` with 5 tables (patients, eligibilityChecks, paRequests, agentRuns, alerts)
- FastAPI stub routes in `server/routes/` returning fixture data from `data/fixtures/`
- 5 mock chart fixtures in `data/charts/` (MRN-00421 through MRN-00855)
- CI/CD pipeline in `.github/`
- Agent skeletons in `agents/` with task prompts
- Tool stubs in `tools/`

**Note on PRD sponsor technologies:** Supermemory, HUD/Laminar, and Daytona are listed in the PRD but are **deferred** — do not implement integrations for these unless all core work is complete. Focus on Convex (database), Browser Use (agents), and Agentmail (alerts).

---

## Convex Setup (Do This First in Phase 1)

Before writing Convex functions, you need a running Convex project:

```bash
# 1. Install Convex CLI (if not already)
cd frontend && npm install convex

# 2. Initialize and start Convex dev server
npx convex dev
# This will:
#   - Prompt you to create a Convex account/project (if first time)
#   - Generate convex/_generated/ directory (TypeScript client code)
#   - Start syncing your schema to the Convex backend
#   - Print your CONVEX_URL — copy it

# 3. Get deploy key from Convex dashboard → Settings → Deploy keys

# 4. Set environment variables
# In .env (project root):
#   CONVEX_URL=https://your-project.convex.cloud
#   CONVEX_DEPLOY_KEY=prod:your-deploy-key
# In frontend/.env.local:
#   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

**Convex HTTP API format** (for implementing `server/services/convex_client.py:23-41`):

```python
# Query example
async with httpx.AsyncClient() as client:
    response = await client.post(
        f"{self.base_url}/api/query",
        json={"path": "patients:list", "args": {}},
        headers={"Authorization": f"Convex {self.deploy_key}"},
    )
    return response.json()["value"]

# Mutation example
async with httpx.AsyncClient() as client:
    response = await client.post(
        f"{self.base_url}/api/mutation",
        json={"path": "patients:create", "args": {"mrn": "MRN-00421", ...}},
        headers={"Authorization": f"Convex {self.deploy_key}"},
    )
    return response.json()["value"]
```

**Fallback decision**: If Convex HTTP client proves unreliable or slow (test by Hour 3), pivot to file-based persistence. Agents already write to `output/` via `tools/db_client.py`. FastAPI routes already read from `data/fixtures/`. The frontend can still use Convex directly via the Next.js SDK for real-time updates.

---

## Phase 1 (Hours 2–6) — Backend Foundation

### Dependencies

- `.env` with `CONVEX_URL` and `CONVEX_DEPLOY_KEY` (from Convex setup above)
- `uv pip install -e ".[dev]"` completed
- `npx convex dev` running in a terminal (syncs schema changes)

### Hour 2–3: Convex Mutations & Queries

Create server-side Convex functions for all 5 tables. `convex/schema.ts` already defines the schema — now add CRUD functions.

**Files to create:**

- `convex/patients.ts` — `list`, `getByMrn`, `create`
- `convex/eligibilityChecks.ts` — `list`, `getByMrn`, `create`
- `convex/paRequests.ts` — `list`, `getByMrn`, `getByStatus`, `create`, `updateStatus`
- `convex/agentRuns.ts` — `list`, `getByMrn`, `create`, `complete`
- `convex/alerts.ts` — `list`, `getByMrn`, `create`

Each file follows this pattern (see `convex/schema.ts` for field definitions):

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("patients").collect(),
});

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("patients")
      .withIndex("by_mrn", (q) => q.eq("mrn", args.mrn))
      .first(),
});

export const create = mutation({
  args: { /* match fields from convex/schema.ts patients table */ },
  handler: async (ctx, args) => ctx.db.insert("patients", args),
});
```

### Hour 3–4: Convex HTTP Client

Implement `server/services/convex_client.py` — the skeleton is at lines 16-44. Replace the `NotImplementedError` raises in `query()` (line 31) and `mutation()` (line 41) with actual HTTP calls using the format shown in the Convex Setup section above.

Then replace the stub routes in `server/routes/*.py` to use `convex_client` instead of reading from `data/fixtures/`:

- `server/routes/patients.py` — replace fixture reads with `convex_client.query("patients:list")`
- `server/routes/eligibility.py` — replace fixture reads with Convex queries
- `server/routes/pa_requests.py` — replace fixture reads with Convex queries
- `server/routes/agents.py` — replace fixture reads with Convex queries

### Hour 4–5: Agent Dispatch Logic

Implement `server/services/orchestrator.py` — the skeleton is at lines 17-81 with 4 dispatch functions that currently return placeholder run_ids.

```python
# Pattern for dispatch_eligibility (orchestrator.py:17):
async def dispatch_eligibility(mrn: str, portal: Portal = Portal.STEDI) -> str:
    run_id = f"elig-{mrn}-{int(datetime.utcnow().timestamp())}"
    # 1. Create AgentRun record via Convex (or file fallback)
    # 2. Spawn background task:
    #    task = asyncio.create_task(_run_eligibility(mrn, portal, run_id))
    #    _running_tasks[run_id] = task
    # 3. Return run_id immediately (client polls for status)
    return run_id
```

Wire up `POST /api/eligibility/check` in `server/routes/eligibility.py` to call `dispatch_eligibility()`.

### Hour 5–6: Seed Script + API Test

- Create `scripts/seed_data.py` — reads from `data/fixtures/*.json` and calls Convex mutations to populate the database
- Create `tests/test_api.py` — test each route returns correct response shapes

**Deliverables by Hour 6:**

- [ ] Verify: `npx convex dev` runs without errors and `convex/_generated/` directory exists
- [ ] Verify: `curl http://localhost:8000/api/patients | python -m json.tool` returns patient data
- [ ] Verify: `curl -X POST http://localhost:8000/api/eligibility/check -H "Content-Type: application/json" -d '{"mrn":"MRN-00421","portal":"stedi"}' | python -m json.tool` returns a run_id
- [ ] Verify: `uv run pytest tests/test_api.py -v` passes
- [ ] Verify: `uv run python scripts/seed_data.py` populates data without errors

---

## Phase 2 (Hours 6–12) — Orchestration

### Dependencies

- Phase 1 complete (Convex functions deployed, HTTP client working or file-based fallback decided)
- Dev 2/3 have agent functions importable: `from agents.eligibility_checker import check_eligibility_stedi`

### Hours 6–8: Background Task Management

In `server/services/orchestrator.py`:

- Add a module-level dict to track running tasks: `_running_tasks: dict[str, asyncio.Task] = {}`
- Agent dispatch creates `agentRuns` doc at start (status: "started"), updates on completion
- Add `GET /api/agents/runs/{run_id}` endpoint to `server/routes/agents.py` for polling task status

### Hours 8–10: Flow Chaining

Complete `dispatch_full_flow(mrn)` at `server/services/orchestrator.py:63-81`:

1. Run eligibility check, await result
2. Read eligibility output from `output/eligibility_{mrn}.json`
3. If `pa_required == True`, dispatch PA form filler
4. After PA submission, start status monitoring

### Hours 10–12: Error Handling

- Wrap agent dispatch in try/except — on failure, update `agentRuns` with error message
- Add retry logic using `MAX_AGENT_RETRIES` (3) and `RETRY_BACKOFF_BASE` (2s) from `shared/constants.py`
- Add timeout: cancel agent task after `AGENT_RUN_TIMEOUT` (300s / 5 min) from `shared/constants.py`

**Deliverables by Hour 12:**

- [ ] Verify: `curl -X POST http://localhost:8000/api/pa/submit -H "Content-Type: application/json" -d '{"mrn":"MRN-00421"}' | python -m json.tool` returns run_id and agent starts
- [ ] Verify: `curl http://localhost:8000/api/agents/runs | python -m json.tool` shows agent run history
- [ ] Verify: Server survives agent failure without crashing (kill an agent mid-run and confirm server is still responsive)

---

## Phase 3 (Hours 12–18) — Integration + Notifications

### Dependencies

- All dev branches merged at Merge Point 2 (Hour 12)
- Dev 2/3 agents produce output files in `output/`

### Tasks

- Fix any integration issues discovered at Merge Point 2
- Implement `server/services/notification.py` with real Agentmail API using `AGENTMAIL_API_KEY` from `.env` (or keep console logging if Agentmail setup is slow)
- Harden API error responses (proper HTTP 400/404/500 status codes in `server/routes/*.py`)
- Help other devs debug integration issues (you own the glue layer between agents, API, and frontend)

**Note on patient fixture data**: MRN-00421 does not include patient address or phone number. If Dev 3 reports CoverMyMeds requires these fields, add them to `data/charts/MRN-00421.json`:

```json
"patient": {
    ...
    "address": "123 Main St, Springfield, IL 62704",
    "phone": "555-0199"
}
```

And add `address: Optional[str] = None` and `phone: Optional[str] = None` to `PatientInfo` in `shared/models.py`.

---

## Key Decisions You Own

1. **Convex vs file-based fallback** — If Convex Python HTTP client is too slow or unreliable, pivot to agents writing local JSON + FastAPI reading files. Frontend keeps Convex for real-time via Next.js SDK. Make this call by Hour 3.
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

## Testing With Other Components

**Verify agents can call API (after Phase 1):**

```bash
# Start server
uv run uvicorn server.main:app --reload --port 8000

# Dev 2/3 can trigger agents via API
curl -X POST http://localhost:8000/api/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"mrn": "MRN-00421", "portal": "stedi"}'

# Dev 4 frontend calls same endpoints from frontend/src/lib/api.ts
```

**Verify frontend data flow:**

```bash
# Paste chart → API → Convex → frontend auto-updates
curl -X POST http://localhost:8000/api/patients \
  -H "Content-Type: application/json" \
  -d @data/charts/MRN-00421.json
```
