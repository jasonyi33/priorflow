import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileText, CheckCircle2, XCircle, Clock, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { StatusTimeline } from '../components/StatusTimeline';
import { usePADashboardContext } from '../../lib/hooks';
import { PARequest } from '../../lib/types';

type TabKey = 'all' | 'pending' | 'approved' | 'denied' | 'info_needed';

const PENDING_STATUSES: PARequest['status'][] = ['pending', 'checking_eligibility', 'generating_request', 'submitting'];

function statusBadge(status: PARequest['status']) {
  if (status === 'approved') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase tracking-wide">
        <CheckCircle2 className="size-3" />
        Approved
      </span>
    );
  }

  if (status === 'denied') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/30 rounded font-semibold uppercase tracking-wide">
        <XCircle className="size-3" />
        Denied
      </span>
    );
  }

  if (status === 'more_info_needed') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 border border-amber-400/30 rounded font-semibold uppercase tracking-wide">
        <AlertCircle className="size-3" />
        Info Needed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-muted text-muted-foreground border border-border rounded font-semibold uppercase tracking-wide">
      <Clock className="size-3" />
      Pending
    </span>
  );
}

function stageLabel(status: PARequest['status']) {
  if (status === 'checking_eligibility') return 'Checking eligibility';
  if (status === 'generating_request') return 'Generating request';
  if (status === 'submitting') return 'Submitting to payer';
  if (status === 'pending') return 'Queued';
  return null;
}

export function PARequests() {
  const dashboard = usePADashboardContext();
  const [selectedRequest, setSelectedRequest] = useState<PARequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const requests = dashboard.paRequests;
  const loading = dashboard.loading;

  const filtered: Record<TabKey, PARequest[]> = {
    all: requests,
    pending: requests.filter((request) => PENDING_STATUSES.includes(request.status)),
    approved: requests.filter((request) => request.status === 'approved'),
    denied: requests.filter((request) => request.status === 'denied'),
    info_needed: requests.filter((request) => request.status === 'more_info_needed'),
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
    { key: 'info_needed', label: 'Info Needed' },
  ];

  const items = useMemo(
    () =>
      filtered[activeTab].filter((request) =>
        !search ||
        request.patientName.toLowerCase().includes(search.toLowerCase()) ||
        request.procedureName.toLowerCase().includes(search.toLowerCase()) ||
        request.procedureCode.toLowerCase().includes(search.toLowerCase())
      ),
    [activeTab, filtered, search]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await dashboard.refreshData();
    setRefreshing(false);
  };

  const relatedRun = selectedRequest
    ? dashboard.agentRuns
        .filter((run) => run.patientId === selectedRequest.patientId && run.type === 'pa_submission')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
    : undefined;

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex flex-col gap-4 px-3 lg:px-5 pb-4 bg-background">
        <div className="flex-1 rounded border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 bg-foreground rounded-sm rotate-45 flex-none" />
              <span className="text-sm font-semibold uppercase tracking-widest">Authorization Requests</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] tracking-[0.12em] uppercase border border-border rounded text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-0 rounded overflow-hidden border border-border">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-[10px] tracking-[0.12em] font-semibold transition-colors whitespace-nowrap ${
                      activeTab === tab.key ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label} <span className="opacity-60">({filtered[tab.key].length})</span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search requests…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded w-44 focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap">{items.length} total</span>
          </div>

          <div className="grid grid-cols-12 gap-x-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 border-b border-border/50">
            <span className="col-span-3">Patient</span>
            <span className="col-span-4">Procedure</span>
            <span className="col-span-1">Code</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-2 text-right">Updated</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-x-3 px-5 py-3 items-center">
                  <div className="col-span-3 h-4 bg-muted rounded animate-pulse" />
                  <div className="col-span-4 h-3 bg-muted rounded animate-pulse" />
                  <div className="col-span-1 h-3 bg-muted rounded animate-pulse" />
                  <div className="col-span-2 h-5 bg-muted rounded animate-pulse mx-auto" />
                  <div className="col-span-2 h-3 bg-muted rounded animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No requests found</div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto">
              {items.map((request) => {
                const stage = stageLabel(request.status);
                return (
                  <div
                    key={request.id}
                    onClick={() => {
                      setSelectedRequest(request);
                      setDetailsOpen(true);
                    }}
                    className="grid grid-cols-12 gap-x-3 items-center px-5 py-3 hover:bg-accent/35 transition-colors cursor-pointer"
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="text-sm font-semibold truncate">{request.patientName}</div>
                      {request.approvalCode && (
                        <div className="text-[10px] text-success/80 font-semibold tracking-wide">Auth: {request.approvalCode}</div>
                      )}
                    </div>
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FileText className="size-3 flex-none" />
                        <span className="truncate">{request.procedureName}</span>
                      </div>
                      {stage && <div className="text-[10px] text-amber-700/80 mt-0.5 tracking-wide">{stage}…</div>}
                      {request.denialReason && (
                        <div className="text-[10px] text-destructive/80 mt-0.5 truncate">{request.denialReason}</div>
                      )}
                    </div>
                    <div className="col-span-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{request.procedureCode || '—'}</span>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {statusBadge(request.status)}
                    </div>
                    <div className="col-span-2 text-[10px] text-muted-foreground/40 text-right whitespace-nowrap">
                      {formatDistanceToNow(new Date(request.lastUpdated), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="tracking-wider text-sm uppercase">PA Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block size-1.5 bg-foreground rounded-sm rotate-45" />
                  <span className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Patient Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Patient</div>
                    <div className="font-semibold">{selectedRequest.patientName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Procedure</div>
                    <div className="font-semibold">{selectedRequest.procedureName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Code</div>
                    <div className="font-semibold">{selectedRequest.procedureCode || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Last Updated</div>
                    <div className="font-semibold">{new Date(selectedRequest.lastUpdated).toLocaleString()}</div>
                  </div>
                  {selectedRequest.approvalCode && (
                    <div>
                      <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Auth Code</div>
                      <div className="font-semibold text-success">{selectedRequest.approvalCode}</div>
                    </div>
                  )}
                  {relatedRun && (
                    <div>
                      <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Latest Agent Run</div>
                      <div className="font-semibold">{relatedRun.id}</div>
                    </div>
                  )}
                  {selectedRequest.denialReason && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-[10px] tracking-wider uppercase mb-0.5">Denial Reason</div>
                      <div className="text-destructive text-xs">{selectedRequest.denialReason}</div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block size-1.5 bg-foreground rounded-sm rotate-45" />
                  <span className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Status Timeline</span>
                </div>
                <StatusTimeline request={selectedRequest} run={relatedRun} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
