# PriorFlow

AI-powered prior authorization agent that automates healthcare PA workflows using Browser Use (Playwright + LLM browser automation).

## What This Project Does

Navigates real payer portals (CoverMyMeds, Stedi) and pulls supplementary data from Flexpa (FHIR API) to:
1. Check patient insurance eligibility (Agent 1)
2. Fill and submit PA forms with clinical justification (Agent 2 — core feature)
3. Monitor PA determination status and send alerts (Agent 3)

## Architecture

```
Frontend (Next.js + Convex real-time) → FastAPI server → Browser Use agents → Real payer portals
```

- **Backend**: FastAPI orchestration at `server/main.py`, dispatches agents as async tasks
- **Agents**: `agents/` directory, each uses Browser Use SDK to drive a browser
- **Shared types**: `shared/models.py` (Pydantic) and `convex/schema.ts` — single source of truth
- **Frontend**: `frontend/` — Next.js with Convex for real-time subscriptions
- **Mock data**: `data/charts/` — 5 patient chart JSON fixtures (no real PHI)

## Development Principles

### KISS — Keep It Simple
- Prefer flat, obvious code over clever abstractions
- One file per agent. One file per route. No deep nesting
- If a function is only used once, inline it. Don't extract "for reusability"
- Browser Use agents are prompt-driven — keep task prompts clear and step-by-step, not abstractly parameterized

### YAGNI — You Aren't Gonna Need It
- Do not build features that aren't in the current sprint task
- No config systems, plugin architectures, or generic frameworks
- No database migrations tooling — this is a hackathon, schemas are append-only
- If a TODO says "implement in Phase 3", leave the skeleton and move on

### TDD — Test-Driven Development
- Write or update tests before implementing features
- All shared models must have test coverage (`tests/test_models.py`)
- API routes get basic request/response tests (`tests/test_api.py`)
- Agent tests are lightweight — verify chart loading and output schema conformance, not browser automation
- Run `uv run pytest` before every commit

## Key Commands

```bash
# Setup
uv venv --python 3.12
uv pip install -e ".[dev]"
cp .env.example .env  # Fill in credentials

# Run tests
uv run pytest

# Start backend
uv run uvicorn server.main:app --reload --port 8000

# Start frontend
cd frontend && npm run dev

# Run agents standalone
uv run python scripts/run_eligibility.py MRN-00421
uv run python scripts/run_pa.py MRN-00421
uv run python scripts/run_full_flow.py MRN-00421
```

## Project Structure

```
shared/models.py          # PROTECTED — all Pydantic data contracts
shared/constants.py       # PROTECTED — portal URLs, timeouts, config
convex/schema.ts          # PROTECTED — database schema
agents/
  eligibility_checker.py  # Agent 1 — Stedi eligibility
  pa_form_filler.py       # Agent 2 — CoverMyMeds PA submission (core demo)
  status_monitor.py       # Agent 3 — status polling + alerts
tools/                    # Agent helper functions (@tools.action)
server/                   # FastAPI orchestration
  routes/                 # API endpoints (patients, eligibility, pa, agents)
  services/               # Orchestrator, Convex client, notifications
data/charts/              # Mock patient chart JSON fixtures
data/fixtures/            # Sample agent output for stubs
frontend/                 # Next.js + Convex dashboard
tests/                    # pytest tests
```

## Protected Files

`shared/models.py` and `convex/schema.ts` are the data contracts between all components. When modifying them:
- New fields must be `Optional` with defaults
- Never remove or rename existing fields
- Run full test suite after changes

## File Ownership (4-Developer Split)

- **Dev 1** (Infrastructure): `shared/`, `server/`, `convex/`, `data/`, `scripts/`, root configs
- **Dev 2** (Eligibility + Monitor): `agents/eligibility_checker.py`, `agents/status_monitor.py`, `tools/chart_loader.py`, `tools/eligibility_parser.py`, `tools/alert_sender.py`
- **Dev 3** (PA Form Filler): `agents/pa_form_filler.py`, `tools/justification_gen.py`, `tools/form_mapper.py`
- **Dev 4** (Frontend): `frontend/`

## Code Style

- Python: standard library conventions, type hints on function signatures
- No docstrings on obvious functions. Comments only where logic isn't self-evident
- Agents: keep task prompts readable — they're the primary documentation of what the agent does
- Frontend: TypeScript strict, Tailwind for styling, no component libraries

## Common Pitfalls

- `browser-use` agents need `BROWSER_USE_API_KEY` in `.env` to use `ChatBrowserUse()`
- CoverMyMeds may require MFA — use `sensitive_data` param and `initial_actions` for login
- Convex Python access goes through FastAPI HTTP endpoints (`tools/db_client.py`), not direct SDK
- All datetime fields use UTC. Frontend formats to local time for display
- Agent GIF recordings go to `output/` — this directory is gitignored except `.gitkeep`
