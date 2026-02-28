import { agentRuns } from "@/lib/data/fixtures";
import { AgentActivityFeed } from "@/components/agent-activity-feed";

export default function AgentActivityPage() {
  const completed = agentRuns.filter((r) => r.success === true).length;
  const failed = agentRuns.filter((r) => r.success === false).length;
  const running = agentRuns.filter((r) => r.success === undefined).length;

  const totalSteps = agentRuns.reduce((sum, r) => sum + r.steps_taken, 0);

  const agentTypeCounts = agentRuns.reduce(
    (acc, r) => {
      acc[r.agent_type] = (acc[r.agent_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Agent Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time feed of AI agent runs across all portals.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Runs</p>
          <p className="text-2xl font-semibold text-card-foreground">{agentRuns.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-semibold text-emerald-600">{completed}</p>
          {failed > 0 && <p className="text-xs text-red-500 mt-1">{failed} failed</p>}
          {running > 0 && <p className="text-xs text-blue-500 mt-1">{running} running</p>}
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Steps</p>
          <p className="text-2xl font-semibold text-card-foreground">{totalSteps}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">By Type</p>
          <div className="flex flex-col gap-1 mt-1">
            {Object.entries(agentTypeCounts).map(([type, count]) => (
              <p key={type} className="text-xs text-muted-foreground">
                <span className="font-medium text-card-foreground">{count}</span>{" "}
                {type === "eligibility" ? "Eligibility" : type === "pa_form_filler" ? "PA Filler" : "Monitor"}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <AgentActivityFeed runs={agentRuns} />
    </div>
  );
}
