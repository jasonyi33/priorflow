# Dev 4 — Frontend Engineer

## Your Mission

Build the Next.js dashboard that visualizes the entire PA lifecycle in real-time: patient charts, eligibility results, PA request status, and agent activity. Also build the mock portal fallback page.

## Your Files

You own the entire `frontend/` directory:

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Convex provider already set up)
│   │   ├── page.tsx                # Home dashboard with summary metrics
│   │   ├── patients/page.tsx       # Patient list + chart upload
│   │   ├── eligibility/page.tsx    # Eligibility check results
│   │   ├── pa-requests/page.tsx    # PA request tracking
│   │   ├── agent-activity/page.tsx # Real-time agent run feed
│   │   └── mock-portal/page.tsx    # Fallback mock payer portal
│   ├── components/
│   │   ├── ConvexProvider.tsx       # Already set up
│   │   ├── PatientCard.tsx          # You create
│   │   ├── PatientList.tsx          # You create
│   │   ├── ChartUploader.tsx        # You create
│   │   ├── EligibilityResult.tsx    # You create
│   │   ├── PARequestCard.tsx        # You create
│   │   ├── PAStatusBadge.tsx        # You create
│   │   ├── StatusTimeline.tsx       # You create
│   │   └── AgentActivityFeed.tsx    # You create
│   └── lib/
│       ├── api.ts                   # API client (already created)
│       └── types.ts                 # TypeScript types (already created)
```

**Do NOT modify:** `shared/`, `agents/`, `tools/`, `server/`, `convex/schema.ts`

## Branch

```bash
git checkout -b dev-4/frontend
```

---

## What's Already Set Up

- Next.js 16 with TypeScript + Tailwind CSS 4
- Convex provider in `src/components/ConvexProvider.tsx` (works with or without `NEXT_PUBLIC_CONVEX_URL`)
- API client in `src/lib/api.ts` with typed functions for all backend endpoints
- TypeScript types in `src/lib/types.ts` mirroring `shared/models.py`
- Stub pages for all 6 routes (home, patients, eligibility, pa-requests, agent-activity, mock-portal)
- Root layout at `src/app/layout.tsx` with Geist font and ConvexProvider wrapping all children

---

## Component Patterns

Use these patterns consistently across all pages:

**Data-fetching page (server component with client child):**

```tsx
// app/patients/page.tsx — server component (no "use client")
import { PatientList } from "@/components/PatientList";

export default function PatientsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Patients</h1>
      <PatientList />
    </main>
  );
}
```

```tsx
// components/PatientList.tsx — client component (fetches data)
"use client";
import { useEffect, useState } from "react";
import { listPatients } from "@/lib/api";
import type { PatientChart } from "@/lib/types";
import { PatientCard } from "./PatientCard";

export function PatientList() {
  const [patients, setPatients] = useState<PatientChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPatients()
      .then(setPatients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading patients...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!patients.length) return <div className="text-gray-500">No patients found.</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {patients.map((chart) => (
        <PatientCard key={chart.patient.mrn} chart={chart} />
      ))}
    </div>
  );
}
```

**Presentational component (no data fetching):**

```tsx
// components/PatientCard.tsx — no "use client" needed if no hooks/interactivity
import type { PatientChart } from "@/lib/types";

export function PatientCard({ chart }: { chart: PatientChart }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold">{chart.patient.name}</h3>
      <p className="text-sm text-gray-500">
        MRN: {chart.patient.mrn} | DOB: {chart.patient.dob}
      </p>
      <p className="text-sm">Payer: {chart.insurance.payer}</p>
      <p className="text-sm">
        Dx: {chart.diagnosis.icd10} — {chart.diagnosis.description}
      </p>
      {chart.medication && (
        <p className="text-sm">
          Rx: {chart.medication.name} {chart.medication.dose}
        </p>
      )}
    </div>
  );
}
```

**Navigation:** Create a shared nav component and add it to `layout.tsx`. Link to all 5 pages: Patients, Eligibility, PA Requests, Agent Activity, Mock Portal.

---

## Data Sources

You have two data sources — use whichever is available:

### 1. FastAPI Backend (always available from Hour 0)

```typescript
import { listPatients, getEligibility, listPARequests } from "@/lib/api";

// These call http://localhost:8000/api/...
const patients = await listPatients();
const eligibility = await getEligibility("MRN-00421");
const paRequests = await listPARequests();
```

The backend returns fixture/stub data immediately. As Dev 1 replaces stubs with real Convex integration, your API calls automatically get live data.

### 2. Convex Direct (available once `NEXT_PUBLIC_CONVEX_URL` is configured)

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Real-time subscription — auto-updates when data changes
const patients = useQuery(api.patients.list);
const eligibility = useQuery(api.eligibilityChecks.getByMrn, { mrn: "MRN-00421" });
```

**Important**: `convex/_generated/api` only exists after Dev 1 runs `npx convex dev`. Until then, Convex imports will fail. Build against the FastAPI backend first.

**Recommendation:** Build against the FastAPI backend first (works immediately). Switch to Convex `useQuery` in Phase 2 for real-time updates.

---

## Phase 1 (Hours 2–6) — Core Components

### Dependencies

- `cd frontend && npm install` completed
- Backend running: `uv run uvicorn server.main:app --reload --port 8000` (returns fixture data)
- `frontend/.env.local` created with `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

### Hours 2–3: Navigation + Patient List

Build the navigation and patients page:

**Files to create:**

- `src/components/NavBar.tsx` — horizontal nav with links to all pages
- `src/components/PatientCard.tsx` — shows patient name, DOB, MRN, payer, diagnosis, medication
- `src/components/PatientList.tsx` — fetches `listPatients()`, renders PatientCard grid

Add `<NavBar />` to `src/app/layout.tsx` inside the `<body>` tag, above `{children}`.

### Hours 3–5: Eligibility + PA Request Views

**Files to create:**

- `src/components/EligibilityResultCard.tsx` — shows coverage status, copay, deductible, PA required flag
- `src/components/PARequestCard.tsx` — shows PA status, medication, fields filled count, gaps detected count
- `src/components/PAStatusBadge.tsx` — color-coded badge (see Component Patterns)

```tsx
// components/PAStatusBadge.tsx
import type { PAStatus } from "@/lib/types";

const colors: Record<PAStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  more_info_needed: "bg-orange-100 text-orange-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function PAStatusBadge({ status }: { status: PAStatus }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
```

### Hours 5–6: Agent Activity Feed

**File to create:** `src/components/AgentActivityFeed.tsx`

- List of agent runs showing type, patient, portal, status, steps
- Each entry shows: "Eligibility check for Jane Doe on Stedi — Completed (18/25 steps)"
- Use polling on `listAgentRuns()` for now, switch to Convex subscription in Phase 2

**Deliverables by Hour 6:**

- [ ] Verify: `cd frontend && npm run dev` starts without errors at http://localhost:3000
- [ ] Verify: Patient list page renders (shows fixture data from backend or loading state)
- [ ] Verify: Navigation links work between all pages
- [ ] Verify: `cd frontend && npm run build` succeeds (no TypeScript errors)

---

## Phase 2 (Hours 6–12) — Interactive Features

### Dependencies

- Phase 1 complete (all pages render with fixture data)
- Dev 1's API returns real data (or fixtures are fine)

### Hours 6–8: PA Request Detail View

- Click a PA request card to expand or navigate to detail:
  - Fields filled (checklist with checkmarks)
  - Gaps detected (warning list in yellow/orange)
  - Clinical justification text (scrollable)
  - GIF recording link (if `gif_path` is available)

**File to create:** `src/components/StatusTimeline.tsx`

Shows PA lifecycle as a horizontal timeline:

```
Eligibility Checked (10:30) → PA Submitted (11:15) → Awaiting Determination → Approved (14:30)
```

### Hours 8–10: Real-Time Updates

Switch data sources from API polling to Convex subscriptions (only if Dev 1 has Convex running and `NEXT_PUBLIC_CONVEX_URL` is set):

```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function PARequestsPage() {
  const requests = useQuery(api.paRequests.list);
  if (!requests) return <div className="text-gray-500">Loading...</div>;
  // renders immediately, auto-updates when agents write new data
}
```

If Convex isn't available, keep using the FastAPI polling approach — it works fine for the demo.

### Hours 10–12: Chart Uploader + Mock Portal

**File to create:** `src/components/ChartUploader.tsx`

- Textarea where user can paste a patient chart JSON
- "Upload" button that calls `uploadChart()` then `triggerEligibilityCheck()`
- Validation: `try { JSON.parse(text) } catch { show error }`
- Show error message if JSON is malformed
- Show success toast after upload

**Mock Portal** (`src/app/mock-portal/page.tsx`):

- Simple PA form with fields for: patient info, diagnosis, medication, CPT code
- Auto-approve/deny logic based on whether required fields are present
- Only needed if CoverMyMeds blocks browser automation

**Deliverables by Hour 12:**

- [ ] Verify: Clicking a PA request shows detail view with StatusTimeline
- [ ] Verify: Pasting JSON into ChartUploader and clicking Upload calls the API
- [ ] Verify: Mock portal page has a working PA form with approve/deny
- [ ] Verify: `cd frontend && npm run build` still succeeds

---

## Phase 3 (Hours 12–18) — Polish

### Dependencies

- All dev branches merged at Merge Point 2 (Hour 12)
- Backend returns real agent data (not just fixtures)

### Hours 12–14: Replace All Stubs

- Ensure all pages use live data (no more hardcoded fixtures in page files)
- Handle loading states: show skeleton/spinner while data loads
- Handle error states: show error message if API call fails
- Handle empty states: "No eligibility checks yet" instead of blank page

### Hours 14–16: UI Polish

- Responsive layout (works on laptop screens for demo)
- Consistent spacing, typography, colors
- Loading spinners for async operations (agent dispatch takes seconds)
- Success toasts when agent is dispatched ("Eligibility check started...")
- Navigation breadcrumbs or back buttons

### Hours 16–18: Home Dashboard

Build the summary dashboard on `src/app/page.tsx`:

- Count of active PAs by status (pending, submitted, approved, denied) using PAStatusBadge
- Recent eligibility checks with results
- Recent agent activity
- Quick action buttons: "New Eligibility Check", "Submit PA" (call `triggerEligibilityCheck()` / `triggerPASubmission()`)

---

## Running the Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

The backend should be running too:

```bash
uv run uvicorn server.main:app --reload --port 8000
```

Or use the dev startup script:

```bash
./scripts/dev_start.sh
```

## Environment Variables

In `frontend/.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=                          # From Convex dashboard (Dev 1 provides)
NEXT_PUBLIC_API_URL=http://localhost:8000/api     # FastAPI backend
```

## Testing With Other Components

**Trigger agent runs from the frontend:**

1. Start backend: `uv run uvicorn server.main:app --reload --port 8000`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to Patients page → click a patient → click "Check Eligibility"
4. Watch Agent Activity page for real-time updates
5. Navigate to PA Requests page to see results

**If backend isn't running:** Pages should show loading/error states gracefully, not crash.

**Type sync check:** If `src/lib/types.ts` doesn't match what the API returns, check `shared/models.py` for the source of truth and update your types to match.

## Common Issues

- **CORS errors:** The FastAPI server already has CORS configured for `localhost:3000` in `server/main.py`. If you change the frontend port, ask Dev 1 to update CORS origins
- **Convex not connected:** `ConvexProvider` in `src/components/ConvexProvider.tsx` gracefully handles missing `NEXT_PUBLIC_CONVEX_URL` — components render without Convex, using API calls instead
- **`convex/_generated/api` not found:** This is generated by `npx convex dev`. Until Dev 1 sets up Convex, do NOT import from `convex/_generated/`. Use the FastAPI `lib/api.ts` functions instead
- **Types out of sync:** If `lib/types.ts` doesn't match what the API returns, check `shared/models.py` for the source of truth and update your types
- **Build fails on tsc:** The CI runs `tsc --noEmit` — fix type errors before pushing. Run `cd frontend && npx tsc --noEmit` locally to check

## Design Notes

- Use Tailwind CSS — no component libraries needed
- Keep it clean and professional — this is for healthcare, not a gaming app
- Color coding: green=good (approved, active), yellow=warning (pending), red=bad (denied), blue=info (submitted)
- Font: Geist (already configured in `src/app/layout.tsx`)
- The demo is 3 minutes — every screen should tell its story at a glance
