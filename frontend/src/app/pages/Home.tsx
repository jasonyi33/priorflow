import { ChangeEvent, useRef, useState } from 'react';
import { usePADashboardContext } from '../../lib/hooks';
import { PAStatus, PARequest, Patient } from '../../lib/types';
import { AlertTriangle, Check, X, Info, Clock, Upload, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

// ─── Status config ───────────────────────────────────────────────────────────
const PA_STATUS_CONFIG: Record<PAStatus, { label: string; cls: string }> = {
  approved:             { label: 'Approved',    cls: 'bg-success/10 text-success border border-success/30' },
  denied:               { label: 'Denied',      cls: 'bg-destructive/10 text-destructive border border-destructive/30' },
  pending:              { label: 'Pending',      cls: 'bg-warning/10 text-warning border border-warning/30' },
  checking_eligibility: { label: 'Eligibility', cls: 'bg-primary/10 text-primary border border-primary/30' },
  generating_request:   { label: 'Drafting',    cls: 'bg-primary/10 text-primary border border-primary/30' },
  submitting:           { label: 'Submitted',   cls: 'bg-primary/10 text-primary border border-primary/30' },
  more_info_needed:     { label: 'Info Needed', cls: 'bg-warning/10 text-warning border border-warning/30' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${d}d ${h % 24}h`;
}

// ─── Pipeline Stage Definition ────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { roman: 'I',   id: 'intake',      label: 'INTAKE',      sub: 'Request Received',   statuses: ['pending'] as PAStatus[] },
  { roman: 'II',  id: 'eligibility', label: 'ELIGIBILITY', sub: 'Insurance Verified',  statuses: ['checking_eligibility'] as PAStatus[] },
  { roman: 'III', id: 'drafting',    label: 'AI DRAFTING', sub: 'PA Generation',       statuses: ['generating_request'] as PAStatus[] },
  { roman: 'IV',  id: 'submission',  label: 'SUBMITTED',   sub: 'Sent to Payer',       statuses: ['submitting'] as PAStatus[] },
  { roman: 'V',   id: 'decision',    label: 'DECISION',    sub: 'Final Determination', statuses: ['approved', 'denied', 'more_info_needed'] as PAStatus[] },
];

// ─── Animated Flow Connector ──────────────────────────────────────────────────
function FlowConnector({ active, throughput }: { active: boolean; throughput: number }) {
  return (
    <div className="flex-none flex flex-col items-center justify-start w-12 pt-10 gap-1">
      <div className="relative w-full flex items-center">
        <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="overflow-visible w-full">
          <line x1="0" y1="12" x2="48" y2="12" stroke="var(--border)" strokeWidth="1.5" strokeDasharray={active ? "none" : "4 3"} />
          {active && (
            <>
              <circle r="3" cy="12" fill="var(--foreground)" opacity="0">
                <animateTransform attributeName="transform" type="translate" values="-6,0;54,0" dur="2s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="opacity" values="0;0.6;0.6;0" dur="2s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="3" cy="12" fill="var(--foreground)" opacity="0">
                <animateTransform attributeName="transform" type="translate" values="-6,0;54,0" dur="2s" repeatCount="indefinite" begin="1s" />
                <animate attributeName="opacity" values="0;0.6;0.6;0" dur="2s" repeatCount="indefinite" begin="1s" />
              </circle>
            </>
          )}
          {/* Arrow head */}
          <polyline points="42,8 48,12 42,16" stroke="var(--border)" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
      {throughput > 0 && (
        <span className="text-[9px] text-muted-foreground/50 tracking-wider">{throughput} total</span>
      )}
    </div>
  );
}

// ─── Pipeline Stage Column ────────────────────────────────────────────────────
function PipelineStage({
  stage, requests, isDecision, decisionRequests, maxInStage, patients,
}: {
  stage: typeof PIPELINE_STAGES[0];
  requests: PARequest[];
  isDecision: boolean;
  decisionRequests?: PARequest[];
  maxInStage: number;
  patients: Patient[];
}) {
  const displayRequests = isDecision ? (decisionRequests ?? []) : requests;
  const count = displayRequests.length;
  const active = count > 0;

  // Oldest request age
  const oldest = displayRequests.length > 0
    ? displayRequests.reduce((prev, curr) =>
        new Date(curr.lastUpdated) < new Date(prev.lastUpdated) ? curr : prev
      )
    : null;

  // Volume fill percentage
  const fillPct = maxInStage > 0 ? Math.round((count / maxInStage) * 100) : 0;

  const approved  = decisionRequests?.filter(r => r.status === 'approved').length ?? 0;
  const denied    = decisionRequests?.filter(r => r.status === 'denied').length ?? 0;
  const moreInfo  = decisionRequests?.filter(r => r.status === 'more_info_needed').length ?? 0;

  return (
    <div className={`flex-1 min-w-0 flex flex-col rounded border transition-all ${
      active
        ? 'border-border bg-card'
        : 'border-border/35 bg-card/40'
    }`}>
      {/* Stage header — fixed height so all columns align */}
      <div className={`px-3 py-3 border-b min-h-[64px] flex flex-col justify-center ${active ? 'border-border' : 'border-border/30'}`}>
        <div className="text-[10px] text-muted-foreground/60 tracking-[0.18em] mb-1 uppercase truncate">
          {stage.roman} — {stage.sub}
        </div>
        <div className={`text-sm font-semibold tracking-widest uppercase ${active ? 'text-foreground' : 'text-muted-foreground/30'}`}>
          {stage.label}
        </div>
      </div>

      {/* Count + meta */}
      <div className="px-3 pt-3 pb-3">
        <div className={`text-6xl font-bold tabular-nums leading-none mb-3 ${active ? 'text-foreground' : 'text-muted-foreground/18'}`} style={{ fontFamily: '"Playfair Display", serif' }}>
          {count}
        </div>
        {oldest && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/55 mb-3">
            <Clock className="size-3 flex-none" />
            oldest: {relativeTime(oldest.lastUpdated)} in queue
          </div>
        )}

        {/* Volume bar */}
        <div className="h-1.5 rounded-full bg-border/50 overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-foreground/40 transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {/* Request content */}
        {isDecision ? (
          <div className="flex flex-col gap-1">
            {approved > 0 && (
              <div className="flex items-center gap-2.5">
                <Check className="size-4 flex-none text-success" />
                <span className="text-base font-bold tabular-nums text-success">{approved}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">approved</span>
              </div>
            )}
            {denied > 0 && (
              <div className="flex items-center gap-2.5">
                <X className="size-4 flex-none text-destructive" />
                <span className="text-base font-bold tabular-nums text-destructive">{denied}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">denied</span>
              </div>
            )}
            {moreInfo > 0 && (
              <div className="flex items-center gap-2.5">
                <Info className="size-4 flex-none text-warning" />
                <span className="text-base font-bold tabular-nums text-warning">{moreInfo}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">info needed</span>
              </div>
            )}
            {count === 0 && (
              <span className="text-[10px] text-muted-foreground/25 uppercase tracking-widest">No determinations</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.slice(0, 3).map(req => {
              const patient = patients.find(p => p.id === req.patientId);
              return (
                <div key={req.id} className="flex flex-col gap-0.5 px-2 py-2 rounded border border-border/60 bg-accent/40 min-w-0 cursor-pointer hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`size-2 rounded-full flex-none shrink-0 ${
                      req.status === 'pending' ? 'bg-warning animate-pulse' : 'bg-foreground/60 animate-pulse'
                    }`} />
                    <span className="text-sm font-semibold truncate leading-tight">{req.patientName}</span>
                  </div>
                  <div className="pl-4 text-[11px] text-muted-foreground/70 truncate">{req.procedureCode} · {req.procedureName.split(' ').slice(0, 3).join(' ')}</div>
                </div>
              );
            })}
            {requests.length > 3 && (
              <div className="text-xs text-muted-foreground/45 px-3 tracking-wider">
                +{requests.length - 3} more in queue
              </div>
            )}
            {requests.length === 0 && (
              <span className="text-[10px] text-muted-foreground/25 uppercase tracking-widest">Queue empty</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Needs Attention ─────────────────────────────────────────────────────────
function NeedsAttention({ requests, patients }: { requests: PARequest[]; patients: Patient[] }) {
  const urgent = requests.filter(r => r.status === 'more_info_needed' || r.status === 'denied');
  return (
    <div className="rounded border border-border bg-card overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-widest">
          <AlertTriangle className="size-4 text-warning" />
          Needs Attention
        </div>
        {urgent.length > 0 && (
          <span className="px-2 py-0.5 text-[9px] bg-warning/10 text-warning border border-warning/30 rounded font-bold uppercase tracking-wider">
            {urgent.length} required
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {urgent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Check className="size-5 text-success mx-auto mb-2.5" />
            <p className="text-sm text-muted-foreground">All cases on track</p>
            <p className="text-xs text-muted-foreground/50 mt-1">No immediate action required</p>
          </div>
        ) : (
          urgent.map(req => {
            const patient = patients.find(p => p.id === req.patientId);
            const isMoreInfo = req.status === 'more_info_needed';
            return (
              <div key={req.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-accent/30 transition-colors cursor-pointer">
                <div className={`mt-1.5 size-2 rounded-full flex-none ${isMoreInfo ? 'bg-warning' : 'bg-destructive'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-lg font-semibold truncate" style={{ fontFamily: '"Playfair Display", serif' }}>{req.patientName}</span>
                    <span className="text-xs text-muted-foreground/45 tabular-nums">{relativeTime(req.lastUpdated)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate mb-1.5">{req.procedureName}</div>
                  {patient && <div className="text-xs text-muted-foreground/50 truncate mb-2">{patient.memberId} · {patient.insuranceProvider}</div>}
                  {isMoreInfo ? (
                    <div className="text-xs text-warning font-medium">→ Additional documentation required</div>
                  ) : (
                    <div className="text-xs text-destructive font-medium">
                      {req.denialReason ? `→ Denied: ${req.denialReason}` : '→ Authorization denied — review for appeal'}
                    </div>
                  )}
                </div>
                <span className={`text-[9px] px-2 py-1 rounded border font-bold uppercase tracking-wider flex-none ${
                  isMoreInfo
                    ? 'bg-warning/10 text-warning border-warning/30'
                    : 'bg-destructive/10 text-destructive border-destructive/30'
                }`}>
                  {isMoreInfo ? 'ACTION' : 'DENIED'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Home() {
  const data = usePADashboardContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleDashboardUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await api.uploadPdfAndStartFlow(selected);
      toast.success(
        `Intake started for ${result.mrn} (${result.patientCreated ? 'new patient' : 'updated patient'})`
      );
      if (result.missingFields.length > 0) {
        toast.info(`Missing fields detected: ${result.missingFields.slice(0, 3).join(', ')}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (data.loading) {
    return (
      <div className="flex flex-col gap-4 px-3 lg:px-5 py-4 bg-background min-h-full ring-2 ring-pop">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}
        </div>
        <div className="h-72 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const stageData = PIPELINE_STAGES.map(stage => ({
    ...stage,
    requests: data.paRequests.filter(r => stage.statuses.includes(r.status)),
  }));

  const decisionRequests = data.paRequests.filter(r =>
    ['approved', 'denied', 'more_info_needed'].includes(r.status)
  );

  const inFlightCount = data.paRequests.filter(r =>
    ['pending', 'checking_eligibility', 'generating_request', 'submitting'].includes(r.status)
  ).length;

  // Max count across all stages (for volume bars)
  const maxInStage = Math.max(
    ...stageData.map(s => s.id === 'decision' ? decisionRequests.length : s.requests.length),
    1
  );

  // Cumulative throughput per connector (total requests that have passed through each boundary)
  const cumulativeThrough = stageData.map((_, idx) =>
    data.paRequests.filter(r => {
      const stageOrder = ['intake', 'eligibility', 'drafting', 'submission', 'decision'];
      const requestStageIdx = stageOrder.findIndex(s =>
        stageData.find(sd => sd.id === s)?.statuses.includes(r.status)
      );
      return requestStageIdx > idx;
    }).length
  );

  return (
    <div className="flex flex-col relative w-full gap-1 min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex flex-col gap-4 px-3 lg:px-5 pb-4 ring-2 ring-pop bg-background">
        {/* ── Dashboard Intake Upload ── */}
        <div className="rounded border border-border bg-card px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] tracking-[0.18em] text-muted-foreground/55 uppercase mb-1">New Intake</div>
            <div className="text-sm text-foreground">Upload a chart PDF to create/update patient and start full agent flow.</div>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleDashboardUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded border border-border bg-accent hover:bg-accent/80 text-xs font-semibold tracking-wider uppercase disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>
          </div>
        </div>

        {/* ── Stat Bar ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'APPROVAL RATE',
              value: `${data.approvalRate}%`,
              sub: `${data.approvedCount} approved / ${data.deniedCount} denied`,
              alert: data.approvalRate < 60,
            },
            {
              label: 'AVG. TURNAROUND',
              value: `${data.avgTurnaroundHours}h`,
              sub: 'mean time from intake to determination',
              alert: data.avgTurnaroundHours > 24,
            },
            {
              label: 'IN PIPELINE',
              value: String(inFlightCount),
              sub: data.urgentPendingCount > 0
                ? `${data.urgentPendingCount} case${data.urgentPendingCount > 1 ? 's' : ''} overdue (>24h)`
                : `${data.paRequests.length} total cases tracked`,
              alert: data.urgentPendingCount > 0,
            },
          ].map((stat, i) => (
        <div className="rounded border border-border bg-card px-6 py-5">
              <div className="text-[10px] tracking-[0.18em] text-muted-foreground/55 uppercase mb-2">{stat.label}</div>
              <div className={`text-6xl font-bold tabular-nums leading-none mb-2 ${stat.alert ? 'text-warning' : ''}`} style={{ fontFamily: '"Playfair Display", serif' }}>
                {stat.value}
              </div>
              <div className={`text-sm ${stat.alert ? 'text-warning/80' : 'text-muted-foreground/50'}`}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Live PA Pipeline ── */}
        <div className="rounded border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="inline-block size-2 bg-foreground rounded-sm rotate-45" />
              <span className="text-sm font-semibold uppercase tracking-widest">
                Prior Authorization Pipeline
              </span>
              <span className="text-xs text-muted-foreground/40 uppercase tracking-wider">
                — Live Agent Workflow
              </span>
            </div>
            <div className="flex items-center gap-4">
              {inFlightCount > 0 && (
                <span className="flex items-center gap-2 text-xs text-foreground/70">
                  <span className="size-2 rounded-full bg-foreground/70 animate-pulse inline-block" />
                  {inFlightCount} active
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/40">
                {data.paRequests.length} total requests
              </span>
            </div>
          </div>

          {/* Stage columns */}
          <div className="p-6 flex items-stretch gap-0">
            {stageData.map((stage, idx) => {
              const isDecision = stage.id === 'decision';
              const hasNext = idx < stageData.length - 1;
              const active = (isDecision ? decisionRequests.length : stage.requests.length) > 0;
              const nextActive = hasNext && (
                isDecision ? false : stageData[idx + 1].requests.length > 0 || decisionRequests.length > 0
              );

              return (
                <div key={stage.id} className="flex items-stretch flex-1 min-w-0">
                  <PipelineStage
                    stage={stage}
                    requests={stage.requests}
                    isDecision={isDecision}
                    decisionRequests={isDecision ? decisionRequests : undefined}
                    maxInStage={maxInStage}
                    patients={data.patients}
                  />
                  {hasNext && (
                    <FlowConnector
                      active={active || nextActive}
                      throughput={cumulativeThrough[idx]}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pipeline footer: aggregate bar */}
          <div className="px-5 pb-5">
            <div className="border border-border/50 rounded px-4 py-3 bg-accent/30 flex items-center gap-6">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Pipeline summary</span>
              <div className="flex-1 flex items-center gap-2">
                {stageData.map((stage, idx) => {
                  const cnt = stage.id === 'decision' ? decisionRequests.length : stage.requests.length;
                  const pct = data.paRequests.length > 0 ? (cnt / data.paRequests.length) * 100 : 0;
                  return (
                    <div key={stage.id} className="flex items-center gap-1.5">
                      <div className="text-[9px] text-muted-foreground/45 uppercase">{stage.roman}</div>
                      <div className="h-1.5 rounded-full bg-border min-w-[2rem] overflow-hidden" style={{ width: `${Math.max(pct, 4)}px`, minWidth: '2rem' }}>
                        <div className="h-full bg-foreground/50 rounded-full" style={{ width: `${pct > 0 ? 100 : 0}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground/55 tabular-nums">{cnt}</div>
                      {idx < stageData.length - 1 && <span className="text-muted-foreground/25 text-xs">·</span>}
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">{data.paRequests.length} total</span>
            </div>
          </div>
        </div>

        {/* ── Bottom: Needs Attention + Recent Cases ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[340px]">
          <div className="lg:col-span-2 h-full">
            <NeedsAttention requests={data.paRequests} patients={data.patients} />
          </div>

          <div className="lg:col-span-3 rounded border border-border bg-card overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="inline-block size-2 bg-foreground rounded-sm rotate-45" />
                <span className="text-sm font-semibold uppercase tracking-widest">Case Registry</span>
              </div>
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                Recent — {data.paRequests.length} total
              </span>
            </div>

            {data.paRequests.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">No cases on record</div>
            ) : (
              <div className="flex-1 overflow-hidden divide-y divide-border">
                <div className="grid grid-cols-12 gap-x-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/45 border-b border-border/50">
                  <span className="col-span-3">Patient</span>
                  <span className="col-span-4">Procedure</span>
                  <span className="col-span-2">Insurer</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-1 text-right">Age</span>
                </div>
                {data.paRequests.slice(0, 4).map(req => {
                  const cfg     = PA_STATUS_CONFIG[req.status];
                  const patient = data.patients.find(p => p.id === req.patientId);
                  return (
                    <div key={req.id} className="grid grid-cols-12 gap-x-3 items-center px-5 py-2 hover:bg-accent/35 transition-colors cursor-pointer">
                      <div className="col-span-3 min-w-0 overflow-hidden">
                        <div className="text-sm font-semibold truncate">{req.patientName}</div>
                        {patient && <div className="text-[10px] text-muted-foreground/45 truncate">{patient.memberId}</div>}
                      </div>
                      <div className="col-span-4 min-w-0 overflow-hidden">
                        <div className="text-sm truncate">{req.procedureName}</div>
                        <div className="text-[10px] text-muted-foreground/45 truncate">{req.procedureCode}</div>
                      </div>
                      <div className="col-span-2 min-w-0 overflow-hidden text-sm text-muted-foreground truncate">
                        {patient?.insuranceProvider ?? '—'}
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wide ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="col-span-1 text-[10px] text-muted-foreground/40 text-right tabular-nums whitespace-nowrap">
                        {relativeTime(req.lastUpdated)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
