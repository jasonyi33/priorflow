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
import { buildDemoSnapshot } from './demoData';

const POLL_INTERVAL_MS = 5000;
const DEMO_DATA_ENABLED = import.meta.env.VITE_ENABLE_DEMO_DATA !== 'false';
const MIN_DEMO_PATIENTS = 7;
const MIN_DEMO_ELIGIBILITY = 7;
const MIN_DEMO_PA_REQUESTS = 7;
const MIN_DEMO_AGENT_RUNS = 7;

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

function mergeSparseById<T extends { id: string }>(live: T[], demo: T[], minCount: number): T[] {
  const liveIds = new Set(live.map((item) => item.id));
  if (live.length >= minCount) {
    return live;
  }

  return [
    ...live,
    ...demo.filter((item) => !liveIds.has(item.id)).slice(0, Math.max(minCount - live.length, 0)),
  ];
}

function sortByDate<T>(items: T[], getDate: (item: T) => string | undefined): T[] {
  return [...items].sort((a, b) => {
    const left = new Date(getDate(a) || 0).getTime();
    const right = new Date(getDate(b) || 0).getTime();
    return right - left;
  });
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

    const demoSnapshot = buildDemoSnapshot(livePatients);
    const shouldUseDemo =
      DEMO_DATA_ENABLED &&
      (
        livePatients.length < MIN_DEMO_PATIENTS ||
        liveEligibility.length < MIN_DEMO_ELIGIBILITY ||
        livePARequests.length < MIN_DEMO_PA_REQUESTS ||
        liveAgentRuns.length < MIN_DEMO_AGENT_RUNS
      );

    const nextPatients = shouldUseDemo
      ? mergeSparseById(livePatients, demoSnapshot.patients, MIN_DEMO_PATIENTS)
      : livePatients;
    const nextEligibility = shouldUseDemo
      ? sortByDate(
          mergeSparseById(liveEligibility, demoSnapshot.eligibilityResults, MIN_DEMO_ELIGIBILITY),
          (item) => item.checkDate
        )
      : liveEligibility;
    const nextPARequests = shouldUseDemo
      ? sortByDate(
          mergeSparseById(livePARequests, demoSnapshot.paRequests, MIN_DEMO_PA_REQUESTS),
          (item) => item.lastUpdated
        )
      : livePARequests;
    const nextAgentRuns = shouldUseDemo
      ? sortByDate(
          mergeSparseById(liveAgentRuns, demoSnapshot.agentRuns, MIN_DEMO_AGENT_RUNS),
          (item) => item.completedAt || item.startedAt
        )
      : liveAgentRuns;

    setPatients(nextPatients);
    setEligibilityResults(nextEligibility);
    setPARequests(nextPARequests);
    setAgentRuns(nextAgentRuns);
    setIsDemoMode(shouldUseDemo);
    setHealth(
      liveHealth ||
        (shouldUseDemo
          ? {
              status: 'ok',
              service: 'priorflow-demo',
              checkedAt: new Date().toISOString(),
              apiBase: API_BASE,
            }
          : {
              ...DEFAULT_HEALTH,
              checkedAt: new Date().toISOString(),
            })
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
