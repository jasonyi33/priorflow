import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router';
import { IntakeSessionTrace, WorkflowStageKey, WorkflowStageState } from '../../lib/types';

const STAGE_ORDER: WorkflowStageKey[] = [
  'upload',
  'intake',
  'eligibility',
  'pa_submission',
  'status_monitor',
  'final_outcome',
];

const STAGE_LABELS: Record<WorkflowStageKey, string> = {
  upload: 'Upload',
  intake: 'Intake Parse',
  eligibility: 'Eligibility Agent',
  pa_submission: 'PA Submission Agent',
  status_monitor: 'Status Monitor Agent',
  final_outcome: 'Final Outcome',
};

const STAGE_STATE_CLS: Record<WorkflowStageState, string> = {
  waiting: 'bg-muted text-muted-foreground border-border',
  running: 'bg-primary/10 text-primary border-primary/30',
  succeeded: 'bg-success/10 text-success border-success/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  skipped: 'bg-accent text-muted-foreground border-border',
};

function formatTimeSince(iso?: string): string {
  if (!iso) return '—';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function StageStateIcon({ state }: { state: WorkflowStageState }) {
  if (state === 'running') return <Loader2 className="size-3 animate-spin" />;
  if (state === 'succeeded') return <CheckCircle2 className="size-3" />;
  if (state === 'failed') return <AlertCircle className="size-3" />;
  if (state === 'skipped') return <CircleSlash className="size-3" />;
  return <span className="inline-block size-1.5 rounded-full bg-muted-foreground/40" />;
}

interface IntakeFlowTrackerProps {
  sessions: IntakeSessionTrace[];
  refreshing: boolean;
  dataSourceMode: 'live' | 'demo';
  lastUpdatedAt?: string;
  onRefresh: () => Promise<void>;
  onRetryUpload: () => void;
}

export function IntakeFlowTracker({
  sessions,
  refreshing,
  dataSourceMode,
  lastUpdatedAt,
  onRefresh,
  onRetryUpload,
}: IntakeFlowTrackerProps) {
  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-[10px] tracking-[0.18em] text-muted-foreground/55 uppercase mb-1">Workflow Visibility</div>
          <div className="text-sm font-semibold tracking-wide">Intake Flow Tracker</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded border ${
            dataSourceMode === 'live'
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-warning/10 text-warning border-warning/30'
          }`}>
            {dataSourceMode === 'live' ? 'Live Data' : 'Demo Data'}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            Updated {formatTimeSince(lastUpdatedAt)}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded border border-border bg-accent hover:bg-accent/80 uppercase tracking-wider disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {dataSourceMode === 'demo' && (
        <div className="px-5 py-2.5 bg-warning/10 border-b border-warning/20 text-[11px] text-warning">
          Demo mode is enabled. Some records may be synthetic and not from the live backend.
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">No intake uploads in this session yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload a chart PDF to see each stage update in real time.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.sessionId} className="px-5 py-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{session.fileName}</div>
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    Session {session.sessionId.slice(-8)} · started {formatTimeSince(session.startedAt)}
                    {session.mrn ? ` · MRN ${session.mrn}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.mrn && (
                    <Link
                      to={`/agent-activity?mrn=${encodeURIComponent(session.mrn)}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded border border-border hover:bg-accent uppercase tracking-wider"
                    >
                      <ExternalLink className="size-3" />
                      Agent Activity
                    </Link>
                  )}
                  <button
                    onClick={onRetryUpload}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded border border-border hover:bg-accent uppercase tracking-wider"
                  >
                    <RotateCcw className="size-3" />
                    Retry Upload
                  </button>
                </div>
              </div>

              {session.missingFields.length > 0 && (
                <div className="text-[11px] text-warning bg-warning/10 border border-warning/20 rounded px-3 py-2">
                  Missing extracted fields: {session.missingFields.join(', ')}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {STAGE_ORDER.map((stageKey) => {
                  const state = session.stages[stageKey];
                  const detail = session.stageDetails[stageKey];
                  return (
                    <div key={stageKey} className="border border-border rounded px-3 py-2 bg-accent/20">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/65">{STAGE_LABELS[stageKey]}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border ${STAGE_STATE_CLS[state]}`}>
                          <StageStateIcon state={state} />
                          {state}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed min-h-8">
                        {detail || 'Awaiting update'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <details className="rounded border border-border bg-background/70 px-3 py-2">
                <summary className="cursor-pointer text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
                  Technical details
                </summary>
                <div className="mt-2 text-[11px] text-muted-foreground/80 space-y-1">
                  <div>Endpoint: POST /api/intake/pdf</div>
                  <div>Last HTTP status: {session.lastHttpStatus ?? 'n/a'}</div>
                  <div>Last poll: {formatTimeSince(session.lastPolledAt)}</div>
                  <div>Polling: {session.polling ? 'active' : 'stopped'}</div>
                  <div>Eligibility run: {session.runIds.eligibility || 'n/a'}</div>
                  <div>PA run: {session.runIds.pa_submission || 'n/a'}</div>
                  <div>Status run: {session.runIds.status_monitor || 'n/a'}</div>
                  {session.lastError && (
                    <div className="text-destructive">Error: {session.lastError}</div>
                  )}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
