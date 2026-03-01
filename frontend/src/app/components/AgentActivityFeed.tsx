import { AgentRun } from '../../lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentActivityFeedProps {
  runs: AgentRun[];
}

export function AgentActivityFeed({ runs }: AgentActivityFeedProps) {
  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedRuns.map((run) => (
        <div key={run.id} className="bg-card rounded-lg border border-border p-4 hover:border-emerald-500/20 transition-colors">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="space-y-1 flex-1">
              <h3 className="text-xs font-bold tracking-wider">{run.patientName.toUpperCase()}</h3>
              <p className="text-[11px] text-muted-foreground capitalize tracking-wider">
                {run.type.replace('_', ' ')}
              </p>
            </div>
            {run.status === 'running' && (
              <span className="px-2 py-0.5 text-[9px] bg-primary/5 text-primary rounded border border-primary/10 tracking-[0.15em] font-semibold flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                RUNNING
              </span>
            )}
            {run.status === 'completed' && (
              <span className="px-2 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 tracking-[0.15em] font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                COMPLETED
              </span>
            )}
            {run.status === 'failed' && (
              <span className="px-2 py-0.5 text-[9px] bg-destructive/10 text-destructive rounded border border-destructive/20 tracking-[0.15em] font-semibold flex items-center gap-1">
                <XCircle className="size-3" />
                FAILED
              </span>
            )}
          </div>

          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <Clock className="size-3" />
              <span className="tracking-wider">Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}</span>
            </div>
            {run.completedAt && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <CheckCircle2 className="size-3" />
                <span className="tracking-wider">Completed {formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {run.logs && run.logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block size-1.5 bg-emerald-500/60 rounded-sm" />
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">ACTIVITY LOG</p>
              </div>
              <ScrollArea className="h-32 rounded-md border border-border bg-primary/[0.02] p-3">
                <div className="space-y-1">
                  {run.logs.map((log, index) => (
                    <p key={index} className="text-[10px] text-muted-foreground tracking-wider leading-relaxed">
                      {log}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {run.result && (
            <div className="rounded-md border border-border bg-primary/[0.02] p-3 mt-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block size-1.5 bg-emerald-500/60 rounded-sm" />
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">RESULT</p>
              </div>
              <pre className="text-[10px] text-muted-foreground tracking-wider">
                {JSON.stringify(run.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}

      {sortedRuns.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-xs tracking-wider uppercase">
          No agent activity yet
        </div>
      )}
    </div>
  );
}