# Convex Setup for Multi-Developer Workflows

Use local, untracked env files so each developer can use their own Convex deploy key.

## Backend (FastAPI / Python)

Create `/.env.local` (gitignored):

```bash
CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOY_KEY=dev:<deployment>|<token>
```

`server/config.py` loads `.env` first, then `.env.local` (override), so personal keys stay local.

## Frontend (Next.js / Convex CLI)

From `frontend/`, create/update `frontend/.env.local`:

```bash
CONVEX_DEPLOY_KEY=dev:<deployment>|<token>
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

The project uses `frontend/convex.json` with:

```json
{ "functions": "../convex/" }
```

This keeps Convex functions in the repo root `convex/` while running CLI from `frontend/`.

## Deploy Functions (non-interactive)

```bash
cd frontend
CONVEX_DEPLOY_KEY=... npx convex dev --once
```

## Verify via Backend

```bash
CONVEX_URL=... CONVEX_DEPLOY_KEY=... uv run python scripts/seed_data.py
```

Never commit real deploy keys to tracked files or PR comments.
