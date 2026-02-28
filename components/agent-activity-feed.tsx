import type { AgentRun } from "@/lib/data/types";
import { getPatientByMrn } from "@/lib/data/fixtures";

const agentTypeLabels: Record<string, string> = {
  eligibility: "Eligibility Check",
  pa_form_filler: "PA Form Filler",
  status_monitor: "Status Monitor",
};

const agentTypeIcons: Record<string, string> = {
  eligibility: "bg-blue-100 text-blue-600",
  pa_form_filler: "bg-teal-100 text-teal-600",
  status_monitor: "bg-indigo-100 text-indigo-600",
};

const portalLabels: Record<string, string> = {
  stedi: "Stedi",
  claimmd: "Claim.MD",
  covermymeds: "CoverMyMeds",
  mock: "Mock Portal",
};

export function AgentActivityFeed({ runs }: { runs: AgentRun[] }) {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((run) => (
        <AgentRunItem key={run.id} run={run} />
      ))}
    </div>
  );
}

function AgentRunItem({ run }: { run: AgentRun }) {
  const patient = getPatientByMrn(run.mrn);
  const started = new Date(run.started_at);
  const completed = run.completed_at ? new Date(run.completed_at) : null;
  const duration = completed
    ? Math.round((completed.getTime() - started.getTime()) / 1000)
    : null;

  const progressPct = Math.round((run.steps_taken / run.max_steps) * 100);

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${agentTypeIcons[run.agent_type]}`}>
        {run.agent_type === "eligibility" && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 9l2 2 3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {run.agent_type === "pa_form_filler" && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M5 3h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 7h6M6 10h6M6 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {run.agent_type === "status_monitor" && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 9h3l2-4 3 8 2-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              {agentTypeLabels[run.agent_type]} for {patient?.patient.name || run.mrn}
            </p>
            <p className="text-xs text-muted-foreground">
              {portalLabels[run.portal]} &middot; {started.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              {duration !== null && ` &middot; ${formatDuration(duration)}`}
            </p>
          </div>
          <div>
            {run.success === true && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Complete
              </span>
            )}
            {run.success === false && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                Failed
              </span>
            )}
            {run.success === undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                Running
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${run.success === true ? "bg-emerald-500" : run.success === false ? "bg-red-400" : "bg-primary"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {run.steps_taken}/{run.max_steps} steps
          </span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}
