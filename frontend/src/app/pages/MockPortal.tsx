import { useState } from 'react';
import { Info, CheckCircle2, XCircle, Clock, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface SubmissionResult {
  status: 'approved' | 'denied' | 'pending';
  authCode?: string;
  message: string;
  submittedAt: string;
}

const quickFillScenarios = [
  {
    name: 'MRI Approval Scenario',
    data: {
      memberId: 'MEM-2024-001',
      procedureCode: '72148',
      diagnosis: 'M54.5 — Low back pain. Patient presents with 6-week history of progressive lumbar pain radiating to left lower extremity. Conservative treatment (PT x 4 weeks, NSAIDs) has failed. MRI indicated to rule out disc herniation.',
      providerNpi: '1234567890',
    },
  },
  {
    name: 'CT Scan Pending',
    data: {
      memberId: 'MEM-2024-002',
      procedureCode: '71250',
      diagnosis: 'R06.02 — Shortness of breath. Patient with 2-week history of dyspnea on exertion and pleuritic chest pain. CXR showed questionable opacity in RLL. CT indicated for further evaluation.',
      providerNpi: '9876543210',
    },
  },
  {
    name: 'Denial (Insufficient)',
    data: {
      memberId: 'MEM-2024-004',
      procedureCode: '93015',
      diagnosis: 'Chest pain.',
      providerNpi: '5555555555',
    },
  },
];

export function MockPortal() {
  const [formData, setFormData] = useState({ memberId: '', procedureCode: '', diagnosis: '', providerNpi: '' });
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SubmissionResult[]>([]);

  const handleQuickFill = (scenario: typeof quickFillScenarios[0]) => {
    setFormData(scenario.data);
    toast.info(`Loaded: ${scenario.name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const len = formData.diagnosis.trim().length;
    let result: SubmissionResult;
    if (len < 30) {
      result = { status: 'denied', message: 'Medical necessity not established — insufficient clinical documentation provided', submittedAt: new Date().toISOString() };
    } else if (len < 100) {
      result = { status: 'pending', message: 'Additional peer-to-peer review required — documentation needs supplementation', submittedAt: new Date().toISOString() };
    } else {
      result = { status: 'approved', authCode: `AUTH-${Date.now().toString().slice(-6)}`, message: 'Prior authorization approved — clinical justification meets medical policy criteria', submittedAt: new Date().toISOString() };
    }
    setResults(prev => [result, ...prev]);
    if (result.status === 'approved') toast.success('PA Request Approved', { description: `Authorization code: ${result.authCode}` });
    else if (result.status === 'denied') toast.error('PA Request Denied', { description: result.message });
    else toast('PA Request Pending', { description: result.message });
    setSubmitting(false);
    setFormData({ memberId: '', procedureCode: '', diagnosis: '', providerNpi: '' });
  };

  const docLen = formData.diagnosis.trim().length;
  const docHint = docLen === 0 ? '' : docLen < 30 ? 'Likely denied — add more clinical detail' : docLen < 100 ? 'May require peer-to-peer review' : 'Sufficient for approval';
  const docColor = docLen === 0 ? '' : docLen < 30 ? 'text-destructive/70' : docLen < 100 ? 'text-amber-700/70' : 'text-success/80';

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
              This mock portal simulates payer decision-making. Submissions with detailed clinical documentation (100+ chars) are <span className="text-success font-semibold">approved</span>; moderate detail may go <span className="text-amber-700 font-semibold">pending</span>; brief documentation is <span className="text-destructive font-semibold">denied</span>.
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
                {quickFillScenarios.map(s => (
                  <button
                    key={s.name}
                    onClick={() => handleQuickFill(s)}
                    className="px-2.5 py-1 bg-muted/50 border border-border rounded text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors tracking-wide"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 py-4 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Member ID</label>
                  <input
                    placeholder="MEM-2024-001"
                    value={formData.memberId}
                    onChange={e => setFormData({ ...formData, memberId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Procedure / CPT Code</label>
                  <input
                    placeholder="72148"
                    value={formData.procedureCode}
                    onChange={e => setFormData({ ...formData, procedureCode: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Diagnosis &amp; Clinical Justification</label>
                  {docLen > 0 && <span className={`text-[10px] ${docColor}`}>{docLen} chars — {docHint}</span>}
                </div>
                <textarea
                  placeholder="Enter ICD-10 code, diagnosis, and supporting clinical information…"
                  value={formData.diagnosis}
                  onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                  rows={6}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">Provider NPI</label>
                <input
                  placeholder="1234567890"
                  value={formData.providerNpi}
                  onChange={e => setFormData({ ...formData, providerNpi: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-auto w-full py-2.5 bg-foreground text-background rounded text-[11px] tracking-[0.15em] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting to payer portal…' : 'Submit PA Request'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="w-[380px] flex-none flex flex-col rounded border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground/50" />
              <span className="text-sm font-semibold uppercase tracking-widest">Payer Responses</span>
            </div>
            <span className="text-[10px] text-muted-foreground/40">{results.length} total</span>
          </div>

          {results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <Globe className="size-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground/50">Submit a PA request to see the payer response here</p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto flex-1">
              {results.map((result, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'approved' && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase tracking-wide"><CheckCircle2 className="size-3" />Approved</span>}
                    {result.status === 'denied' && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/30 rounded font-semibold uppercase tracking-wide"><XCircle className="size-3" />Denied</span>}
                    {result.status === 'pending' && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 border border-amber-400/30 rounded font-semibold uppercase tracking-wide"><Clock className="size-3" />Pending</span>}
                    {result.authCode && <span className="text-[10px] text-success font-semibold tracking-wide ml-1">{result.authCode}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{result.message}</p>
                  <p className="text-[10px] text-muted-foreground/40">{new Date(result.submittedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Portal feature list */}
          <div className="border-t border-border px-5 py-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40 mb-2">Simulated Features</p>
            {['Clinical documentation analysis', 'Real-time determination', 'Auth code generation', 'Session history tracking'].map(f => (
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

