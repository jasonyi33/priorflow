import { useState, useEffect, useRef } from 'react';
import { Info, CheckCircle2, XCircle, Clock, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface SubmissionResult {
  status: 'running' | 'completed' | 'failed';
  runId: string;
  mrn: string;
  liveUrl?: string;
  message: string;
  submittedAt: string;
  output?: string;
}

interface PatientChart {
  patient: { name: string; first_name: string; last_name: string; dob: string; mrn: string };
  insurance: { payer: string; member_id: string; bin: string; pcn: string; rx_group: string; plan_name: string };
  diagnosis: { icd10: string; description: string };
  medication?: { name: string; dose: string; frequency: string };
  provider: { name: string; npi: string; phone: string; fax: string };
}

const AVAILABLE_MRNS = ['MRN-00421', 'MRN-00522', 'MRN-00633', 'MRN-00744', 'MRN-00855'];

export function MockPortal() {
  const [selectedMrn, setSelectedMrn] = useState('');
  const [chart, setChart] = useState<PatientChart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SubmissionResult[]>([]);
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Load chart data when MRN is selected
  useEffect(() => {
    if (!selectedMrn) { setChart(null); return; }
    fetch(`${API_BASE}/patients/${selectedMrn}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setChart(null); return; }
        // Normalize: API may return nested chart format or flat Convex format
        if (data.patient) {
          setChart(data);
        } else {
          setChart({
            patient: {
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              first_name: data.firstName || '',
              last_name: data.lastName || '',
              dob: data.dob || '',
              mrn: data.mrn || selectedMrn,
            },
            insurance: {
              payer: data.insurance?.payer || '',
              member_id: data.insurance?.memberId || data.insurance?.member_id || '',
              bin: data.insurance?.bin || '',
              pcn: data.insurance?.pcn || '',
              rx_group: data.insurance?.rxGroup || data.insurance?.rx_group || '',
              plan_name: data.insurance?.planName || data.insurance?.plan_name || '',
            },
            diagnosis: {
              icd10: data.diagnosis?.icd10 || '',
              description: data.diagnosis?.description || '',
            },
            medication: data.medication ? {
              name: data.medication.name || '',
              dose: data.medication.dose || '',
              frequency: data.medication.frequency || '',
            } : undefined,
            provider: {
              name: data.provider?.name || '',
              npi: data.provider?.npi || '',
              phone: data.provider?.phone || '',
              fax: data.provider?.fax || '',
            },
          });
        }
      })
      .catch(() => setChart(null));
  }, [selectedMrn]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { Object.values(pollingRef.current).forEach(clearInterval); };
  }, []);

  const pollRunStatus = (runId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/agents/runs/${runId}`);
        if (!res.ok) return;
        const data = await res.json();
        const status = data.status === 'completed' ? (data.success ? 'completed' : 'failed') : data.status === 'failed' ? 'failed' : 'running';
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          delete pollingRef.current[runId];
          setResults(prev => prev.map(r =>
            r.runId === runId
              ? { ...r, status, message: status === 'completed' ? 'PA submitted successfully via CoverMyMeds agent' : `Agent failed: ${data.error_message || 'Unknown error'}` }
              : r
          ));
          if (status === 'completed') toast.success('PA Request Submitted', { description: `Agent completed for ${data.mrn}` });
          else toast.error('PA Request Failed', { description: data.error_message || 'Agent encountered an error' });
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    pollingRef.current[runId] = interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMrn) { toast.error('Please select a patient MRN'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/pa/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mrn: selectedMrn, portal: 'covermymeds' }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const runId = data.data?.run_id || data.run_id || 'unknown';

      const result: SubmissionResult = {
        status: 'running',
        runId,
        mrn: selectedMrn,
        message: 'Browser Use agent is filling out the PA form on CoverMyMeds…',
        submittedAt: new Date().toISOString(),
      };
      setResults(prev => [result, ...prev]);
      toast('PA Agent Dispatched', { description: `Run ${runId} started for ${selectedMrn}` });
      pollRunStatus(runId);
    } catch (err: any) {
      toast.error('Submission Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex gap-4 px-3 lg:px-5 pb-4 bg-background min-h-0">

        {/* ── Left: Submission form ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Info banner */}
          <div className="rounded border border-border bg-card px-5 py-3 flex items-start gap-3">
            <Info className="size-3.5 text-muted-foreground/50 flex-none mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select a patient and submit to trigger the <span className="font-semibold">Browser Use AI agent</span>. The agent will log into CoverMyMeds, fill the PA form with chart data, and submit it automatically.
            </p>
          </div>

          {/* Form panel */}
          <div className="flex-1 rounded border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 bg-foreground rounded-sm rotate-45 flex-none" />
                <span className="text-sm font-semibold uppercase tracking-widest">Submit PA Request</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mr-1">Quick fill:</span>
                {AVAILABLE_MRNS.slice(0, 3).map(mrn => (
                  <button
                    key={mrn}
                    onClick={() => { setSelectedMrn(mrn); toast.info(`Selected ${mrn}`); }}
                    className="px-2.5 py-1 bg-muted/50 border border-border rounded text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors tracking-wide"
                  >
                    {mrn}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 py-4 gap-4">
              {/* MRN Selector */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Patient MRN</label>
                <select
                  value={selectedMrn}
                  onChange={e => setSelectedMrn(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-border"
                >
                  <option value="">Select a patient…</option>
                  {AVAILABLE_MRNS.map(mrn => (
                    <option key={mrn} value={mrn}>{mrn}</option>
                  ))}
                </select>
              </div>

              {/* Chart preview (read-only, auto-populated) */}
              {chart && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Patient Name</label>
                    <input readOnly value={chart.patient.name} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Date of Birth</label>
                    <input readOnly value={chart.patient.dob} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Insurance / Member ID</label>
                    <input readOnly value={`${chart.insurance.payer} — ${chart.insurance.member_id}`} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Provider / NPI</label>
                    <input readOnly value={`${chart.provider.name} — ${chart.provider.npi}`} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Diagnosis (ICD-10)</label>
                    <input readOnly value={`${chart.diagnosis.icd10} — ${chart.diagnosis.description}`} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Medication</label>
                    <input readOnly value={chart.medication ? `${chart.medication.name} ${chart.medication.dose} — ${chart.medication.frequency}` : 'N/A'} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                </div>
              )}

              {!chart && selectedMrn && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <Loader2 className="size-3 animate-spin" /> Loading chart data…
                </div>
              )}

              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={submitting || !selectedMrn}
                  className="w-full py-2.5 bg-foreground text-background rounded text-[11px] tracking-[0.15em] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="size-3 animate-spin" />Dispatching agent…</>
                  ) : (
                    'Submit PA Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="w-[420px] flex-none flex flex-col rounded border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground/50" />
              <span className="text-sm font-semibold uppercase tracking-widest">Agent Runs</span>
            </div>
            <span className="text-[10px] text-muted-foreground/40">{results.length} total</span>
          </div>

          {results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <Globe className="size-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground/50">Submit a PA request to trigger the Browser Use agent</p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto flex-1">
              {results.map((result, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'completed' && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase tracking-wide"><CheckCircle2 className="size-3" />Completed</span>}
                    {result.status === 'failed' && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/30 rounded font-semibold uppercase tracking-wide"><XCircle className="size-3" />Failed</span>}
                    {result.status === 'running' && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 border border-amber-400/30 rounded font-semibold uppercase tracking-wide"><Loader2 className="size-3 animate-spin" />Running</span>}
                    <span className="text-[10px] text-muted-foreground font-mono ml-1">{result.mrn}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{result.message}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-muted-foreground/40">{new Date(result.submittedAt).toLocaleString()}</p>
                    {result.liveUrl && (
                      <a href={result.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400">
                        <ExternalLink className="size-2.5" />Watch live
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Features list */}
          <div className="border-t border-border px-5 py-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40 mb-2">Agent Capabilities</p>
            {['CoverMyMeds login + Okta 2FA', 'Auto-fill PA form from chart data', 'Clinical justification generation', 'Email submission to prescriber'].map(f => (
              <div key={f} className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                <CheckCircle2 className="size-3 text-success/50 flex-none" />
                {f}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

