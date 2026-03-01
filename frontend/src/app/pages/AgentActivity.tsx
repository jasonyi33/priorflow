import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Activity, ChevronRight, Download } from 'lucide-react';
import { usePADashboardContext } from '../../lib/hooks';
import { AgentRun } from '../../lib/types';
import { getAgentTypeLabel } from '../../lib/dashboard';
import { API_ORIGIN } from '../../lib/api';

type TabKey = 'all' | 'running' | 'completed' | 'failed';

function StatusBadge({ status }: { status: AgentRun['status'] }) {
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 border border-amber-400/30 rounded font-semibold uppercase tracking-wide">
        <Loader2 className="size-3 animate-spin" />
        Running
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase tracking-wide">
        <CheckCircle2 className="size-3" />
        Completed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/30 rounded font-semibold uppercase tracking-wide">
      <XCircle className="size-3" />
      Failed
    </span>
  );
}

export function AgentActivity() {
  const dashboard = usePADashboardContext();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const runs = dashboard.agentRuns;

  useEffect(() => {
    if (!selectedId && runs.length > 0) {
      setSelectedId(runs[0].id);
    }
  }, [runs, selectedId]);

  const filtered: Record<TabKey, AgentRun[]> = {
    all: runs,
    running: runs.filter((run) => run.status === 'running'),
    completed: runs.filter((run) => run.status === 'completed'),
    failed: runs.filter((run) => run.status === 'failed'),
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
  ];

  const listItems = filtered[activeTab];
  const selected = useMemo(
    () => runs.find((run) => run.id === selectedId) ?? null,
    [runs, selectedId]
  );

  const duration = selected?.completedAt
    ? differenceInSeconds(new Date(selected.completedAt), new Date(selected.startedAt))
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await dashboard.refreshData();
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex gap-4 px-3 lg:px-5 pb-4 bg-background min-h-0">
        <div className="w-[320px] flex-none flex flex-col rounded border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 bg-foreground rounded-sm rotate-45 flex-none" />
              <span className="text-sm font-semibold uppercase tracking-widest">Agent Runs</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-30"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-[10px] tracking-[0.1em] font-semibold transition-colors ${
                  activeTab === tab.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label} <span className="opacity-60">({filtered[tab.key].length})</span>
              </button>
            ))}
          </div>

          {dashboard.loading ? (
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="px-4 py-3 space-y-1.5">
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : listItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No runs in this category</div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto flex-1">
              {listItems.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedId(run.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    selectedId === run.id ? 'bg-accent/50' : 'hover:bg-accent/25'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{run.patientName}</span>
                      {run.status === 'running' && <Loader2 className="size-3 text-amber-700 animate-spin flex-none" />}
                      {run.status === 'completed' && <CheckCircle2 className="size-3 text-success flex-none" />}
                      {run.status === 'failed' && <XCircle className="size-3 text-destructive flex-none" />}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{getAgentTypeLabel(run.type)}</span>
                      <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap">
                        {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`size-3.5 flex-none transition-colors ${selectedId === run.id ? 'text-foreground' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded border border-border bg-card overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a run to view details
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-bold">{selected.patientName}</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">{getAgentTypeLabel(selected.type)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Started</div>
                    <div className="text-xs">{formatDistanceToNow(new Date(selected.startedAt), { addSuffix: true })}</div>
                  </div>
                  {duration !== null && (
                    <div>
                      <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Duration</div>
                      <div className="text-xs">{duration}s</div>
                    </div>
                  )}
                  {selected.completedAt && (
                    <div>
                      <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Completed</div>
                      <div className="text-xs">{formatDistanceToNow(new Date(selected.completedAt), { addSuffix: true })}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-0 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden border-b border-border">
                  <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border/50">
                    <Activity className="size-3 text-muted-foreground/50" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">Activity Log</span>
                    <span className="text-[10px] text-muted-foreground/30 ml-auto">{selected.logs.length} entries</span>
                  </div>
                  {selected.logs.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No log entries</div>
                  ) : (
                    <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                      {selected.logs.map((log, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <span className="text-[10px] text-muted-foreground/30 w-5 text-right flex-none mt-px">{index + 1}</span>
                          <div
                            className={`size-1.5 rounded-full flex-none mt-1.5 ${
                              log.toLowerCase().includes('error') || log.toLowerCase().includes('fail')
                                ? 'bg-destructive'
                                : log.toLowerCase().includes('success') || log.toLowerCase().includes('complet') || log.toLowerCase().includes('approved')
                                ? 'bg-success'
                                : 'bg-muted-foreground/30'
                            }`}
                          />
                          <span className="text-xs text-muted-foreground leading-relaxed">{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selected.result && (
                  <div className="flex flex-col max-h-48 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border/50">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">Output</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                      {selected.result.gifUrl && (
                        <a
                          href={`${API_ORIGIN}${selected.result.gifUrl}`}
                          download
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                        >
                          <Download className="size-3" />
                          Download Agent Recording (.gif)
                        </a>
                      )}
                      <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(
                          Object.fromEntries(Object.entries(selected.result).filter(([key]) => key !== 'gifUrl')),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
