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

```
git checkout -b dev-4/frontend
```

---

## What's Already Set Up

- Next.js with TypeScript + Tailwind CSS
- Convex provider in `components/ConvexProvider.tsx` (works with or without `NEXT_PUBLIC_CONVEX_URL`)
- API client in `lib/api.ts` with typed functions for all backend endpoints
- TypeScript types in `lib/types.ts` mirroring `shared/models.py`
- Stub pages for all 6 routes (home, patients, eligibility, pa-requests, agent-activity, mock-portal)

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

Convex gives you real-time subscriptions for free — the UI updates automatically when agents write new data.

**Recommendation:** Build against the FastAPI backend first (works immediately). Switch to Convex `useQuery` in Phase 2 for real-time updates.

---

## Phase 1 (Hours 2–6) — Core Components

### Hours 2–3: Page Layout + Patient List

Set up the common layout and build the patients page:

**Components to build:**
- `PatientList` — fetches `listPatients()`, renders a card for each patient
- `PatientCard` — shows patient name, DOB, MRN, payer, diagnosis, medication/procedure

```tsx
// components/PatientCard.tsx
import { PatientChart } from "@/lib/types";

export function PatientCard({ chart }: { chart: PatientChart }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold">{chart.patient.name}</h3>
      <p className="text-sm text-gray-500">MRN: {chart.patient.mrn} | DOB: {chart.patient.dob}</p>
      <p className="text-sm">Payer: {chart.insurance.payer}</p>
      <p className="text-sm">Dx: {chart.diagnosis.icd10} — {chart.diagnosis.description}</p>
      {chart.medication && <p className="text-sm">Rx: {chart.medication.name} {chart.medication.dose}</p>}
      {chart.procedure && <p className="text-sm">Proc: {chart.procedure.cpt} — {chart.procedure.description}</p>}
    </div>
  );
}
```

### Hours 3–5: Eligibility + PA Request Views

**Components to build:**
- `EligibilityResultCard` — shows coverage status, copay, deductible, PA required flag
- `PARequestCard` — shows PA status, medication, fields filled, gaps detected
- `PAStatusBadge` — color-coded badge: green=approved, yellow=pending, red=denied, blue=submitted

```tsx
// components/PAStatusBadge.tsx
import { PAStatus } from "@/lib/types";

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

- `AgentActivityFeed` — list of agent runs showing type, patient, portal, status, steps
- Each entry shows: "Eligibility check for Jane Doe on Stedi — Completed (18/25 steps)"
- Use polling on `listAgentRuns()` for now, switch to Convex subscription later

**Deliverables by Hour 6:**
- [ ] Patient list page renders all 5 fixtures
- [ ] Eligibility page renders sample result
- [ ] PA requests page renders sample submission with status badge
- [ ] Agent activity page renders sample run
- [ ] Pages fetch data from FastAPI backend

---

## Phase 2 (Hours 6–12) — Interactive Features

### Hours 6–8: PA Request Detail View

- Click a PA request card to see full detail:
  - Fields filled (checklist)
  - Gaps detected (warning list)
  - Clinical justification text
  - GIF recording link (if available)
- `StatusTimeline` component showing PA lifecycle:
  ```
  Eligibility Checked (10:30) → PA Submitted (11:15) → Awaiting Determination → Approved (14:30)
  ```

### Hours 8–10: Real-Time Updates

Switch data sources from API polling to Convex subscriptions:
```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function PARequestsPage() {
  const requests = useQuery(api.paRequests.list);
  if (!requests) return <div>Loading...</div>;
  // renders immediately, auto-updates when agents write new data
}
```

This is where the demo gets impressive — the dashboard updates in real-time as agents work.

### Hours 10–12: Chart Uploader + Mock Portal

**ChartUploader:**
- Textarea where user can paste a patient chart JSON
- "Upload" button that calls `uploadChart()` then `triggerEligibilityCheck()`
- Validation: parse JSON, check it matches `PatientChart` shape
- Show error message if JSON is malformed

**Mock Portal (fallback):**
- Simple PA form with fields for: patient info, diagnosis, medication, CPT code
- Auto-approve/deny logic based on whether required fields are present
- Only needed if CoverMyMeds blocks browser automation

**Deliverables by Hour 12:**
- [ ] PA request detail view with StatusTimeline
- [ ] Real-time updates via Convex (or polling fallback)
- [ ] Chart uploader component works
- [ ] Mock portal page has a basic PA form

---

## Phase 3 (Hours 12–18) — Polish

### Hours 12–14: Replace All Stubs

- Ensure all pages use live data (no more hardcoded fixtures)
- Handle loading states: show skeleton/spinner while data loads
- Handle error states: show error message if API call fails
- Handle empty states: "No eligibility checks yet" instead of blank page

### Hours 14–16: UI Polish

- Responsive layout (works on laptop screens for demo)
- Consistent spacing, typography, colors
- Loading spinners for async operations
- Success toasts when agent is dispatched ("Eligibility check started...")
- Navigation breadcrumbs or back buttons

### Hours 16–18: Home Dashboard

Build the summary dashboard on the home page:
- Count of active PAs by status (pending, submitted, approved, denied)
- Recent eligibility checks with results
- Recent agent activity
- Quick actions: "New Eligibility Check", "Submit PA"

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
NEXT_PUBLIC_CONVEX_URL=       # From Convex dashboard, once set up
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # FastAPI backend
```

## Common Issues

- **CORS errors:** The FastAPI server already has CORS configured for `localhost:3000`. If you change the frontend port, update `server/main.py`.
- **Convex not connected:** The `ConvexProvider` gracefully handles missing `NEXT_PUBLIC_CONVEX_URL` — components render without Convex, using API calls instead.
- **Types out of sync:** If `lib/types.ts` doesn't match what the API returns, check `shared/models.py` for the source of truth and update your types.
- **Build fails on tsc:** The CI runs `tsc --noEmit` — fix type errors before pushing.

## Design Notes

- Use Tailwind CSS — no component libraries needed
- Keep it clean and professional — this is for healthcare, not a gaming app
- Color coding: green=good, yellow=warning, red=bad, blue=info
- Font: Geist (already configured in layout)
- The demo is 3 minutes — every screen should tell its story at a glance
