import { useState } from 'react';
import { Lock, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '../components/page-layout';

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
    name: 'CT Scan Pending Scenario',
    data: {
      memberId: 'MEM-2024-002',
      procedureCode: '71250',
      diagnosis: 'R06.02 — Shortness of breath. Patient with 2-week history of dyspnea on exertion and pleuritic chest pain. CXR showed questionable opacity in RLL. CT indicated for further evaluation.',
      providerNpi: '9876543210',
    },
  },
  {
    name: 'Denial Scenario (Insufficient)',
    data: {
      memberId: 'MEM-2024-004',
      procedureCode: '93015',
      diagnosis: 'Chest pain.',
      providerNpi: '5555555555',
    },
  },
];

export function MockPortal() {
  const [formData, setFormData] = useState({
    memberId: '',
    procedureCode: '',
    diagnosis: '',
    providerNpi: '',
  });
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
    
    const diagnosisLength = formData.diagnosis.trim().length;
    let result: SubmissionResult;

    if (diagnosisLength < 30) {
      result = {
        status: 'denied',
        message: 'Medical necessity not established — insufficient clinical documentation provided',
        submittedAt: new Date().toISOString(),
      };
    } else if (diagnosisLength < 100) {
      result = {
        status: 'pending',
        message: 'Additional peer-to-peer review required — documentation needs supplementation',
        submittedAt: new Date().toISOString(),
      };
    } else {
      result = {
        status: 'approved',
        authCode: `AUTH-${Date.now().toString().slice(-6)}`,
        message: 'Prior authorization approved — clinical justification meets medical policy criteria',
        submittedAt: new Date().toISOString(),
      };
    }

    setResults(prev => [result, ...prev]);
    
    if (result.status === 'approved') {
      toast.success('PA Request Approved', { description: `Authorization code: ${result.authCode}` });
    } else if (result.status === 'denied') {
      toast.error('PA Request Denied', { description: result.message });
    } else {
      toast('PA Request Pending', { description: result.message });
    }
    
    setSubmitting(false);
    setFormData({ memberId: '', procedureCode: '', diagnosis: '', providerNpi: '' });
  };

  return (
    <PageLayout header={{ title: 'Mock Payer Portal', description: 'Test PA submissions', icon: Lock }}>
      {/* Info Alert */}
      <div className="bg-success/5 border border-success/20 rounded-lg p-4 flex items-start gap-3">
        <Info className="size-4 text-success shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This mock portal simulates payer decision-making. Submissions with detailed clinical documentation (100+ characters) are approved; brief documentation is denied. This mimics real-world PA requirements.
        </p>
      </div>

      {/* Quick Fill */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block size-2 bg-emerald-500 rounded-sm" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">QUICK FILL SCENARIOS</span>
        </div>
        <p className="text-[11px] text-muted-foreground tracking-wider mb-4">Load a pre-built scenario to test different outcomes</p>
        <div className="flex flex-wrap gap-2">
          {quickFillScenarios.map((scenario) => (
            <button 
              key={scenario.name}
              onClick={() => handleQuickFill(scenario)}
              className="px-3 py-1.5 bg-card border border-border rounded-md text-[10px] tracking-wider font-semibold text-muted-foreground hover:text-foreground hover:border-emerald-500/30 transition-colors"
            >
              {scenario.name}
            </button>
          ))}
        </div>
      </div>

      {/* PA Form */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block size-2 bg-emerald-500 rounded-sm" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">SUBMIT PA REQUEST</span>
        </div>
        <p className="text-[11px] text-muted-foreground tracking-wider mb-4">Enter patient and procedure information</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Member ID</label>
              <input
                placeholder="MEM-2024-001"
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Procedure / CPT Code</label>
              <input
                placeholder="72148"
                value={formData.procedureCode}
                onChange={(e) => setFormData({ ...formData, procedureCode: e.target.value })}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Diagnosis & Clinical Justification</label>
            <textarea
              placeholder="Enter ICD-10 code, diagnosis, and supporting clinical information..."
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={5}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none"
            />
            <p className="text-[10px] text-muted-foreground tracking-wider">
              {formData.diagnosis.length} chars — 
              {formData.diagnosis.length < 30 
                ? ' will likely be denied (add more clinical detail)' 
                : formData.diagnosis.length < 100 
                ? ' may require additional review' 
                : ' sufficient documentation for approval'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">Provider NPI</label>
            <input
              placeholder="1234567890"
              value={formData.providerNpi}
              onChange={(e) => setFormData({ ...formData, providerNpi: e.target.value })}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-500 text-white rounded-md text-[11px] tracking-[0.15em] font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'SUBMITTING TO PAYER PORTAL...' : 'SUBMIT PA REQUEST'}
          </button>
        </form>
      </div>

      {/* Submission History */}
      {results.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block size-2 bg-emerald-500 rounded-sm" />
            <span className="text-xs font-bold tracking-[0.15em] uppercase">SUBMISSION HISTORY</span>
          </div>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg border border-border"
              >
                {result.status === 'approved' ? (
                  <CheckCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : result.status === 'denied' ? (
                  <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-[9px] rounded tracking-[0.15em] font-semibold uppercase ${
                      result.status === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                        : result.status === 'denied' 
                        ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {result.status}
                    </span>
                    {result.authCode && (
                      <span className="text-[10px] text-emerald-600 tracking-wider font-semibold">{result.authCode}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{result.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(result.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portal Features */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block size-2 bg-emerald-500 rounded-sm" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">SIMULATED PORTAL FEATURES</span>
        </div>
        <div className="space-y-2 text-[11px]">
          {[
            'Automated clinical documentation analysis',
            'Real-time determination based on documentation quality',
            'Authorization code generation for approved requests',
            'Submission history tracking within session',
          ].map((feature) => (
            <div key={feature} className="flex gap-2 items-center">
              <span className="text-emerald-500 text-xs">&#10003;</span>
              <span className="text-muted-foreground tracking-wider">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}