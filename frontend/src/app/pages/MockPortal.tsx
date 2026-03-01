import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, CheckCircle2, XCircle, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { usePADashboardContext } from '../../lib/hooks';

interface SubmissionResult {
  status: 'running' | 'completed' | 'failed';
  runId: string;
  mrn: string;
  liveUrl?: string;
  message: string;
  submittedAt: string;
}

interface PatientChart {
  patient: { name: string; first_name: string; last_name: string; dob: string; mrn: string };
  insurance: { payer: string; member_id: string; bin: string; pcn: string; rx_group: string; plan_name: string };
  diagnosis: { icd10: string; description: string };
  medication?: { name: string; dose: string; frequency: string };
  provider: { name: string; npi: string; phone: string; fax: string };
}

export function MockPortal() {
  const dashboard = usePADashboardContext();
  const [selectedMrn, setSelectedMrn] = useState('');
  const [chart, setChart] = useState<PatientChart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const availablePatients = dashboard.patients;
  const recentRuns = useMemo<SubmissionResult[]>(
    () =>
      dashboard.agentRuns
        .filter((run) => run.type === 'pa_submission')
        .map((run) => ({
          status: run.status,
          runId: run.id,
          mrn: run.patientId,
          message: run.logs[run.logs.length - 1] || 'PA submission run active',
          submittedAt: run.startedAt,
        }))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [dashboard.agentRuns]
  );

  useEffect(() => {
    if (!selectedMrn) {
      setChart(null);
      return;
    }

    setChartLoading(true);
    const summary = availablePatients.find((patient) => patient.id === selectedMrn);
    api.getPatient(selectedMrn)
      .then(async (patientSummary) => {
        const resolvedSummary = patientSummary || summary;
        const buildSummaryChart = () => {
          if (!resolvedSummary) {
            setChart(null);
            return;
          }

          setChart({
            patient: {
              name: resolvedSummary.name,
              first_name: resolvedSummary.name.split(' ')[0] || '',
              last_name: resolvedSummary.name.split(' ').slice(1).join(' '),
              dob: resolvedSummary.dateOfBirth,
              mrn: resolvedSummary.id,
            },
            insurance: {
              payer: resolvedSummary.insuranceProvider,
              member_id: resolvedSummary.memberId,
              bin: '',
              pcn: '',
              rx_group: '',
              plan_name: resolvedSummary.planName || '',
            },
            diagnosis: {
              icd10: resolvedSummary.procedureCode || '',
              description: resolvedSummary.procedureName || resolvedSummary.medicationName || '',
            },
            medication: resolvedSummary.medicationName
              ? {
                  name: resolvedSummary.medicationName,
                  dose: '',
                  frequency: '',
                }
              : undefined,
            provider: {
              name: resolvedSummary.providerName || '',
              npi: resolvedSummary.providerNpi || '',
              phone: '',
              fax: '',
            },
          });
        };

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/patients/${selectedMrn}`);
        if (!res.ok) {
          buildSummaryChart();
          return;
        }

        const data = await res.json();
        if (data.patient) {
          setChart(data);
          return;
        }

        buildSummaryChart();
      })
      .catch(() => {
        if (!summary) {
          setChart(null);
          return;
        }

        setChart({
          patient: {
            name: summary.name,
            first_name: summary.name.split(' ')[0] || '',
            last_name: summary.name.split(' ').slice(1).join(' '),
            dob: summary.dateOfBirth,
            mrn: summary.id,
          },
          insurance: {
            payer: summary.insuranceProvider,
            member_id: summary.memberId,
            bin: '',
            pcn: '',
            rx_group: '',
            plan_name: summary.planName || '',
          },
          diagnosis: {
            icd10: summary.procedureCode || '',
            description: summary.procedureName || summary.medicationName || '',
          },
          medication: summary.medicationName
            ? {
                name: summary.medicationName,
                dose: '',
                frequency: '',
              }
            : undefined,
          provider: {
            name: summary.providerName || '',
            npi: summary.providerNpi || '',
            phone: '',
            fax: '',
          },
        });
      })
      .finally(() => setChartLoading(false));
  }, [availablePatients, selectedMrn]);

  useEffect(() => () => {
    Object.values(pollingRef.current).forEach(clearInterval);
  }, []);

  const pollRunStatus = (runId: string) => {
    const interval = setInterval(async () => {
      try {
        const run = await api.getAgentRun(runId);
        if (!run || run.status === 'running') {
          return;
        }
        clearInterval(interval);
        delete pollingRef.current[runId];
        await dashboard.refreshData();
        if (run.status === 'completed') {
          toast.success('PA Request Submitted', { description: `Agent completed for ${run.patientId}` });
        } else {
          toast.error('PA Request Failed', { description: run.logs[run.logs.length - 1] || 'Agent encountered an error' });
        }
      } catch {
        // Ignore transient polling failures.
      }
    }, 5000);

    pollingRef.current[runId] = interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMrn) {
      toast.error('Please select a patient MRN');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createPARequest({
        patientId: selectedMrn,
        procedureCode: chart?.diagnosis.icd10 || '',
        procedureName: chart?.diagnosis.description || 'Prior authorization request',
      });

      toast('PA Agent Dispatched', { description: `Run ${result.agentRunId} started for ${selectedMrn}` });
      await dashboard.refreshData();

      if (result.agentRunId) {
        pollRunStatus(result.agentRunId);
      }
    } catch (err: any) {
      toast.error('Submission Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const runSummary = {
    total: recentRuns.length,
    completed: recentRuns.filter((run) => run.status === 'completed').length,
    failed: recentRuns.filter((run) => run.status === 'failed').length,
  };

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex gap-4 px-3 lg:px-5 pb-4 bg-background min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="rounded border border-border bg-card px-5 py-3 flex items-start gap-3">
            <Info className="size-3.5 text-muted-foreground/50 flex-none mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select a synced patient and dispatch the live PA submission agent. The panel reflects current patient data and actual submission runs instead of fixture MRNs.
            </p>
          </div>

          <div className="flex-1 rounded border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 bg-foreground rounded-sm rotate-45 flex-none" />
                <span className="text-sm font-semibold uppercase tracking-widest">Submit PA Request</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mr-1">Quick fill:</span>
                {availablePatients.slice(0, 3).map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      setSelectedMrn(patient.id);
                      toast.info(`Selected ${patient.id}`);
                    }}
                    className="px-2.5 py-1 bg-muted/50 border border-border rounded text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors tracking-wide"
                  >
                    {patient.id}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 py-4 gap-4">
              <div>
                <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Patient MRN</label>
                <select
                  value={selectedMrn}
                  onChange={(e) => setSelectedMrn(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-border"
                >
                  <option value="">Select a patient…</option>
                  {availablePatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.id} · {patient.name}
                    </option>
                  ))}
                </select>
              </div>

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
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Diagnosis / Procedure</label>
                    <input readOnly value={`${chart.diagnosis.icd10} — ${chart.diagnosis.description}`} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Medication</label>
                    <input readOnly value={chart.medication ? `${chart.medication.name} ${chart.medication.dose} — ${chart.medication.frequency}` : 'N/A'} className="w-full px-3 py-2 bg-muted/30 border border-border rounded text-xs text-muted-foreground" />
                  </div>
                </div>
              )}

              {!chart && selectedMrn && chartLoading && (
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
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Dispatching agent…
                    </>
                  ) : (
                    'Submit PA Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="w-[420px] flex-none flex flex-col rounded border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground/50" />
              <span className="text-sm font-semibold uppercase tracking-widest">Agent Runs</span>
            </div>
            <span className="text-[10px] text-muted-foreground/40">{recentRuns.length} total</span>
          </div>

          {recentRuns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <Globe className="size-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground/50">Submit a PA request to trigger the live agent</p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto flex-1">
              {recentRuns.map((result) => (
                <div key={result.runId} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'completed' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase tracking-wide">
                        <CheckCircle2 className="size-3" />
                        Completed
                      </span>
                    )}
                    {result.status === 'failed' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/30 rounded font-semibold uppercase tracking-wide">
                        <XCircle className="size-3" />
                        Failed
                      </span>
                    )}
                    {result.status === 'running' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 border border-amber-400/30 rounded font-semibold uppercase tracking-wide">
                        <Loader2 className="size-3 animate-spin" />
                        Running
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono ml-1">{result.mrn}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{result.message}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-muted-foreground/40">{new Date(result.submittedAt).toLocaleString()}</p>
                    {result.liveUrl && (
                      <a href={result.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400">
                        <ExternalLink className="size-2.5" />
                        Watch live
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border px-5 py-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40 mb-2">Run Summary</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>Total submission runs</span>
              <span className="font-semibold text-foreground">{runSummary.total}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>Completed</span>
              <span className="font-semibold text-success">{runSummary.completed}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>Failed</span>
              <span className="font-semibold text-destructive">{runSummary.failed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
