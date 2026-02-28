import Link from "next/link";
import { patients, eligibilityResults, paRequests, agentRuns } from "@/lib/data/fixtures";
import { PAStatusBadge } from "@/components/pa-status-badge";
import type { PAStatus } from "@/lib/data/types";

export default function DashboardPage() {
  const approved = paRequests.filter((r) => r.status === "approved").length;
  const submitted = paRequests.filter((r) => r.status === "submitted").length;
  const pending = paRequests.filter((r) => r.status === "pending").length;
  const denied = paRequests.filter((r) => r.status === "denied").length;

  const paRequired = eligibilityResults.filter((r) => r.pa_required).length;
  const coverageActive = eligibilityResults.filter((r) => r.coverage_active).length;

  const completedRuns = agentRuns.filter((r) => r.success === true).length;
  const totalSteps = agentRuns.reduce((sum, r) => sum + r.steps_taken, 0);

  const recentRuns = [...agentRuns]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 5);

  const recentEligibility = [...eligibilityResults]
    .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
    .slice(0, 4);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of PA lifecycle across all patients and portals.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Patients"
          value={patients.length}
          sub={`${patients.filter((p) => p.medication).length} medication, ${patients.filter((p) => p.procedure).length} procedure`}
          href="/patients"
        />
        <MetricCard
          label="Eligibility Checks"
          value={eligibilityResults.length}
          sub={`${coverageActive} active, ${paRequired} PA required`}
          href="/eligibility"
          accent="blue"
        />
        <MetricCard
          label="PA Requests"
          value={paRequests.length}
          sub={`${approved} approved, ${pending + submitted} in progress`}
          href="/pa-requests"
          accent="teal"
        />
        <MetricCard
          label="Agent Runs"
          value={agentRuns.length}
          sub={`${completedRuns} completed, ${totalSteps} total steps`}
          href="/agent-activity"
          accent="indigo"
        />
      </div>

      {/* PA Status Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground">PA Requests by Status</h2>
            <Link href="/pa-requests" className="text-xs text-primary hover:underline">View all</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatusCount status="approved" count={approved} />
            <StatusCount status="submitted" count={submitted} />
            <StatusCount status="pending" count={pending} />
            <StatusCount status="denied" count={denied} />
          </div>

          {/* PA Request List */}
          <div className="flex flex-col gap-2">
            {paRequests.map((req) => {
              const patient = patients.find((p) => p.patient.mrn === req.mrn);
              return (
                <Link
                  key={req.id}
                  href="/pa-requests"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {patient?.patient.first_name?.[0]}{patient?.patient.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{req.medication_or_procedure}</p>
                      <p className="text-xs text-muted-foreground">{patient?.patient.name}</p>
                    </div>
                  </div>
                  <PAStatusBadge status={req.status} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link
                href="/patients"
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 14c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-card-foreground">Upload Patient Chart</span>
              </Link>
              <Link
                href="/eligibility"
                className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5.5 8l2 2 3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-card-foreground">New Eligibility Check</span>
              </Link>
              <Link
                href="/pa-requests"
                className="flex items-center gap-3 p-3 rounded-lg bg-teal-50 hover:bg-teal-100/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 6h6M5 9h6M5 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-card-foreground">Submit PA Request</span>
              </Link>
              <Link
                href="/mock-portal"
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-card-foreground">Mock Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity + Eligibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agent Activity */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground">Recent Agent Activity</h2>
            <Link href="/agent-activity" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentRuns.map((run) => {
              const patient = patients.find((p) => p.patient.mrn === run.mrn);
              const started = new Date(run.started_at);
              return (
                <div key={run.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${run.success ? "bg-emerald-500" : run.success === false ? "bg-red-500" : "bg-blue-500"}`} />
                    <div>
                      <p className="text-sm text-card-foreground">
                        {run.agent_type === "eligibility" ? "Eligibility Check" : run.agent_type === "pa_form_filler" ? "PA Form Fill" : "Status Check"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient?.patient.name} &middot; {run.portal === "covermymeds" ? "CoverMyMeds" : run.portal === "claimmd" ? "Claim.MD" : run.portal.charAt(0).toUpperCase() + run.portal.slice(1)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {started.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Eligibility */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground">Recent Eligibility Checks</h2>
            <Link href="/eligibility" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentEligibility.map((elig) => {
              const patient = patients.find((p) => p.patient.mrn === elig.mrn);
              const checked = new Date(elig.checked_at);
              return (
                <div key={`${elig.mrn}-${elig.portal}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${elig.coverage_active ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div>
                      <p className="text-sm text-card-foreground">{patient?.patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {elig.payer} &middot; {elig.pa_required ? "PA required" : "No PA needed"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {checked.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  href: string;
  accent?: string;
}) {
  const accentColors: Record<string, string> = {
    blue: "border-l-blue-500",
    teal: "border-l-teal-500",
    indigo: "border-l-indigo-500",
  };

  return (
    <Link
      href={href}
      className={`bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-all border-l-4 ${accent ? accentColors[accent] : "border-l-primary"}`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-semibold text-card-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </Link>
  );
}

function StatusCount({ status, count }: { status: PAStatus; count: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
      <PAStatusBadge status={status} />
      <span className="text-lg font-semibold text-card-foreground">{count}</span>
    </div>
  );
}
