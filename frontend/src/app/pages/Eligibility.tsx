import { FileCheck, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '../components/page-layout';
import { useState, useEffect } from 'react';
import { EligibilityResult } from '../../lib/types';
import { api } from '../../lib/api';
import { EligibilityResultCard } from '../components/EligibilityResult';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Eligibility() {
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patients, setPatients] = useState<any[]>([]);

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
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    setChecking(true);
    try {
      const result = await api.checkEligibility(selectedPatientId);
      setResults(prev => [result, ...prev]);
      toast.success(`Eligibility check complete for ${result.patientName}`);
      setSelectedPatientId('');
    } catch (error) {
      toast.error('Failed to check eligibility');
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <PageLayout header={{ title: 'Eligibility Verification', description: 'Check patient coverage', icon: FileCheck }}>
        <div className="space-y-6">
          <div className="h-48 w-full bg-muted rounded-lg animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout header={{ title: 'Eligibility Verification', description: 'Check patient coverage', icon: FileCheck }}>
      {/* Check Eligibility Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">CHECK ELIGIBILITY</span>
        </div>
        <p className="text-[11px] text-muted-foreground tracking-wider mb-4">Verify insurance coverage for a patient</p>
        
        <div className="flex gap-3">
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Select a patient..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id} className="text-xs">
                  {patient.name} - {patient.insuranceProvider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button 
            onClick={handleCheckEligibility} 
            disabled={checking || !selectedPatientId}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-[11px] tracking-wider font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {checking ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                CHECKING...
              </>
            ) : (
              <>
                <Search className="size-3.5" />
                CHECK
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">RECENT CHECKS</span>
        </div>
        {results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs tracking-wider">
            NO ELIGIBILITY CHECKS YET
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((result) => (
              <EligibilityResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}