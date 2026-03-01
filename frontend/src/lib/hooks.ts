import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import { API_BASE, api } from './api';
import { AgentRun, ApiHealth, EligibilityResult, PARequest, Patient } from './types';

const POLL_INTERVAL_MS = 5000;

const PENDING_STATUSES: PARequest['status'][] = [
  'pending',
  'checking_eligibility',
  'generating_request',
  'submitting',
  'more_info_needed',
];

const DEFAULT_HEALTH: ApiHealth = {
  status: 'offline',
  service: 'priorflow',
  checkedAt: new Date().toISOString(),
  apiBase: API_BASE,
};

export interface PADashboardData {
  loading: boolean;
  lastUpdatedAt?: string;
  health: ApiHealth;
  isDemoMode: boolean;
  patients: Patient[];
  eligibilityResults: EligibilityResult[];
  paRequests: PARequest[];
  agentRuns: AgentRun[];
  totalPatients: number;
  totalPAs: number;
  approvedCount: number;
  deniedCount: number;
  pendingCount: number;
  urgentPendingCount: number;
  approvalRate: number;
  avgTurnaroundHours: number;
  activeAgents: number;
  completedAgentRuns: number;
  failedAgentRuns: number;
  queueDepth: number;
  refreshData: () => Promise<void>;
}

function computeMetrics(
  paRequests: PARequest[],
  agentRuns: AgentRun[],
  patients: Patient[],
): Omit<
  PADashboardData,
  'loading' | 'lastUpdatedAt' | 'health' | 'isDemoMode' | 'patients' | 'eligibilityResults' | 'paRequests' | 'agentRuns' | 'refreshData'
> {
  const totalPAs = paRequests.length;
  const approvedCount = paRequests.filter((pa) => pa.status === 'approved').length;
  const deniedCount = paRequests.filter((pa) => pa.status === 'denied').length;
  const pendingCount = paRequests.filter((pa) => PENDING_STATUSES.includes(pa.status)).length;

  const now = Date.now();
  const urgentPendingCount = paRequests.filter((pa) => {
    if (!PENDING_STATUSES.includes(pa.status)) return false;
    const lastUpdated = new Date(pa.lastUpdated).getTime();
    return Number.isFinite(lastUpdated) && now - lastUpdated > 24 * 60 * 60 * 1000;
  }).length;

  const decidedPAs = paRequests.filter(
    (pa) => (pa.status === 'approved' || pa.status === 'denied') && pa.submittedAt
  );

  const approvalRate = approvedCount + deniedCount > 0
    ? Math.round((approvedCount / (approvedCount + deniedCount)) * 100)
    : 0;

  const avgTurnaroundHours = decidedPAs.length > 0
    ? Math.round(
        (decidedPAs.reduce((sum, pa) => {
          const submitted = new Date(pa.submittedAt || pa.lastUpdated).getTime();
          const resolved = new Date(pa.lastUpdated).getTime();
          return sum + Math.max(resolved - submitted, 0) / (1000 * 60 * 60);
        }, 0) / decidedPAs.length) * 10
      ) / 10
    : 0;

  const activeAgents = agentRuns.filter((run) => run.status === 'running').length;
  const completedAgentRuns = agentRuns.filter((run) => run.status === 'completed').length;
  const failedAgentRuns = agentRuns.filter((run) => run.status === 'failed').length;

  return {
    totalPatients: patients.length,
    totalPAs,
    approvedCount,
    deniedCount,
    pendingCount,
    urgentPendingCount,
    approvalRate,
    avgTurnaroundHours,
    activeAgents,
    completedAgentRuns,
    failedAgentRuns,
    queueDepth: pendingCount + activeAgents,
  };
}

export function usePADashboard(): PADashboardData {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
  const [paRequests, setPARequests] = useState<PARequest[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [health, setHealth] = useState<ApiHealth>(DEFAULT_HEALTH);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>();
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const [patientsResult, eligibilityResult, paResult, runsResult, healthResult] = await Promise.allSettled([
      api.getPatients(),
      api.getEligibilityResults(),
      api.getPARequests(),
      api.getAgentRuns(),
      api.getHealth(),
    ]);

    if (!mountedRef.current) {
      return;
    }

    const livePatients = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    const liveEligibility = eligibilityResult.status === 'fulfilled' ? eligibilityResult.value : [];
    const livePARequests = paResult.status === 'fulfilled' ? paResult.value : [];
    const liveAgentRuns = runsResult.status === 'fulfilled' ? runsResult.value : [];
    const liveHealth = healthResult.status === 'fulfilled' ? healthResult.value : undefined;

    setPatients(livePatients);
    setEligibilityResults(liveEligibility);
    setPARequests(livePARequests);
    setAgentRuns(liveAgentRuns);
    setIsDemoMode(false);
    setHealth(
      liveHealth ||
        {
          ...DEFAULT_HEALTH,
          checkedAt: new Date().toISOString(),
        }
    );
    setLastUpdatedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();

    const interval = window.setInterval(() => {
      void fetchData();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [fetchData]);

  const computed = useMemo(
    () => computeMetrics(paRequests, agentRuns, patients),
    [agentRuns, paRequests, patients]
  );

  return {
    loading,
    lastUpdatedAt,
    health,
    isDemoMode,
    patients,
    eligibilityResults,
    paRequests,
    agentRuns,
    refreshData: fetchData,
    ...computed,
  };
}

export const PADashboardContext = createContext<PADashboardData | null>(null);

export function usePADashboardContext(): PADashboardData {
  const ctx = useContext(PADashboardContext);
  if (!ctx) {
    throw new Error('usePADashboardContext must be used within PADashboardContext.Provider');
  }
  return ctx;
}
