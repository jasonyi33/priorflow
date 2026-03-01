import { FileCheck, RefreshCw, Search, CheckCircle2, XCircle, Clock, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { EligibilityResult } from '../../lib/types';
import { api } from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { usePADashboardContext } from '../../lib/hooks';

export function Eligibility() {
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patients, setPatients] = useState<any[]>([]);
  const dashData = usePADashboardContext();

  useEffect(() => {
    Promise.all([
      api.getEligibilityResults(),
      api.getPatients()
    ]).then(([eligibilityData, patientsData]) => {
      setResults(eligibilityData);
      setPatients(patientsData);
      setLoading(false);
    });
  }, []);

  const handleCheckEligibility = async () => {
    if (!selectedPatientId) { toast.error('Please select a patient'); return; }
    setChecking(true);
    try {
      const result = await api.checkEligibility(selectedPatientId);
      setResults(prev => [result, ...prev]);
      toast.success(`Eligibility check complete for ${result.patientName}`);
      setSelectedPatientId('');
    } catch (error) {
      toast.error('Failed to check eligibility');
    } finally {
      setChecking(false);
    }
  };

  const eligible = results.filter(r => r.isEligible).length;
  const notEligible = results.filter(r => !r.isEligible).length;
  const eligibilityRate = results.length > 0 ? Math.round((eligible / results.length) * 100) : 0;
  const uniqueInsurers = new Set(results.map(r => r.insuranceProvider)).size;

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex flex-col gap-4 px-3 lg:px-5 pb-4 bg-background">

        {/* ── Run Check + Results side-by-side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">

          {/* Left: Run check panel */}
          <div className="lg:col-span-1 rounded border border-border bg-card p-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block size-2 bg-foreground rounded-sm rotate-45" />
                <span className="text-sm font-semibold uppercase tracking-widest">Run Eligibility Check</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Verify a patient's insurance coverage in real time via the agent.</p>
            </div>

            <div className="flex flex-col gap-3">
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select a patient…" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">
                      {p.name} — {p.insuranceProvider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected patient preview */}
              {selectedPatientId && (() => {
                const p = patients.find(pt => pt.id === selectedPatientId);
                return p ? (
                  <div className="rounded border border-border/60 bg-muted/40 px-4 py-3 text-xs space-y-1">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-muted-foreground">{p.memberId} · {p.insuranceProvider}</div>
                    <div className="text-muted-foreground">DOB: {new Date(p.dateOfBirth).toLocaleDateString()}</div>
                  </div>
                ) : null;
              })()}

              <button
                onClick={handleCheckEligibility}
                disabled={checking || !selectedPatientId}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checking ? (
                  <><RefreshCw className="size-4 animate-spin" /> Checking…</>
                ) : (
                  <><Search className="size-4" /> Verify Coverage</>
                )}
              </button>
            </div>

            {/* Insurer breakdown */}
            {results.length > 0 && (
              <div className="mt-auto pt-4 border-t border-border">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Insurer Breakdown</div>
                <div className="space-y-2">
                  {Array.from(
                    results.reduce((acc, r) => {
                      acc.set(r.insuranceProvider, (acc.get(r.insuranceProvider) ?? 0) + 1);
                      return acc;
                    }, new Map<string, number>())
                  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([insurer, count]) => (
                    <div key={insurer} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">{insurer}</span>
                      <span className="text-xs font-semibold tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Results table */}
          <div className="lg:col-span-2 rounded border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="inline-block size-2 bg-foreground rounded-sm rotate-45" />
                <span className="text-sm font-semibold uppercase tracking-widest">Recent Checks</span>
              </div>
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                {results.length} total
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-x-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 border-b border-border/50">
              <span className="col-span-2">Patient</span>
              <span className="col-span-3">Insurance</span>
              <span className="col-span-4">Coverage Details</span>
              <span className="col-span-2 text-center">Status</span>
              <span className="col-span-1 text-right">Checked</span>
            </div>

            {loading ? (
              <div className="divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-x-3 px-5 py-3 items-center">
                    <div className="col-span-2 h-4 bg-muted rounded animate-pulse" />
                    <div className="col-span-3 h-3 bg-muted rounded animate-pulse" />
                    <div className="col-span-4 h-3 bg-muted rounded animate-pulse" />
                    <div className="col-span-2 h-5 bg-muted rounded animate-pulse mx-auto" />
                    <div className="col-span-1 h-3 bg-muted rounded animate-pulse ml-auto" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No eligibility checks yet</div>
            ) : (
              <div className="divide-y divide-border overflow-y-auto">
                {results.map(result => (
                  <div key={result.id} className="grid grid-cols-12 gap-x-3 items-center px-5 py-3 hover:bg-accent/35 transition-colors">
                    <div className="col-span-2 min-w-0">
                      <div className="text-sm font-semibold truncate">{result.patientName}</div>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                        <Building2 className="size-3 flex-none" />
                        {result.insuranceProvider}
                      </div>
                    </div>
                    <div className="col-span-4 min-w-0">
                      <div className="text-xs text-muted-foreground/70 leading-snug">
                        {result.coverageDetails ?? '—'}
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {result.isEligible ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase">
                          <CheckCircle2 className="size-3" /> Eligible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/30 rounded font-semibold uppercase">
                          <XCircle className="size-3" /> Denied
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-[10px] text-muted-foreground/40 text-right whitespace-nowrap">
                      {formatDistanceToNow(new Date(result.checkDate), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
