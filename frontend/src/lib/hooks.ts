// ═══════════════════════════════════════════════════
// Central data hooks for PriorFlow dashboard
// All metrics are computed from raw data — swap mock API
// calls for real ones and everything updates automatically.
// ═══════════════════════════════════════════════════

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { api } from './api';
import { PARequest, AgentRun, Patient } from './types';

// ─── CHART DATA (time-series mock — replace with API) ───
const mockChartData = {
  week: [
    { date: 'Mon', submitted: 42, approved: 35, denied: 4 },
    { date: 'Tue', submitted: 58, approved: 48, denied: 6 },
    { date: 'Wed', submitted: 51, approved: 44, denied: 3 },
    { date: 'Thu', submitted: 67, approved: 56, denied: 7 },
    { date: 'Fri', submitted: 45, approved: 38, denied: 5 },
    { date: 'Sat', submitted: 12, approved: 10, denied: 1 },
    { date: 'Sun', submitted: 8, approved: 7, denied: 0 },
  ],
  month: [
    { date: 'Jan', submitted: 820, approved: 705, denied: 72 },
    { date: 'Feb', submitted: 760, approved: 650, denied: 68 },
    { date: 'Mar', submitted: 910, approved: 790, denied: 75 },
    { date: 'Apr', submitted: 880, approved: 760, denied: 80 },
    { date: 'May', submitted: 950, approved: 830, denied: 70 },
    { date: 'Jun', submitted: 870, approved: 745, denied: 82 },
  ],
  year: [
    { date: '2021', submitted: 8200, approved: 6900, denied: 820 },
    { date: '2022', submitted: 9400, approved: 8100, denied: 780 },
    { date: '2023', submitted: 10800, approved: 9350, denied: 850 },
    { date: '2024', submitted: 11500, approved: 10100, denied: 720 },
    { date: '2025', submitted: 6200, approved: 5400, denied: 410 },
  ],
};

// ─── TEAM PERFORMANCE (mock — replace with API) ───
const mockTeamPerformance = [
  { id: 1, name: 'DR. S. CHEN', handle: '@SCHEN', cases: 148, featured: true, subtitle: 'TOP PERFORMER' },
  { id: 2, name: 'AGENT ALPHA', handle: '@ALPHA', cases: 129 },
  { id: 3, name: 'DR. RIVERA', handle: '@MRIVERA', cases: 108 },
  { id: 4, name: 'AGENT BETA', handle: '@BETA', cases: 64 },
];

export type TimePeriod = 'week' | 'month' | 'year';

export interface ChartDataPoint {
  date: string;
  submitted: number;
  approved: number;
  denied: number;
}

export interface TeamMember {
  id: number;
  name: string;
  handle: string;
  cases: number;
  featured?: boolean;
  subtitle?: string;
}

export interface SystemStatusItem {
  title: string;
  value: string;
  status: string;
  variant: 'success' | 'warning' | 'destructive';
}

export interface PADashboardData {
  // Loading state
  loading: boolean;

  // Raw data (for pages that need granular access)
  paRequests: PARequest[];
  agentRuns: AgentRun[];
  patients: Patient[];

  // ── Computed PA metrics ──
  totalPAs: number;
  approvedCount: number;
  deniedCount: number;
  pendingCount: number;       // all non-terminal statuses
  urgentPendingCount: number;  // pending > 24h
  approvalRate: number;        // percentage (0–100)
  avgTurnaroundHours: number;  // average hours from submit → decision

  // ── Agent / system metrics ──
  totalAgentSlots: number;
  activeAgents: number;
  apiUptime: number;           // percentage
  queueDepth: number;

  // ── Derived display items ──
  systemStatuses: SystemStatusItem[];
  teamPerformance: TeamMember[];
  chartData: Record<TimePeriod, ChartDataPoint[]>;
}

// Statuses that mean "still in progress"
const PENDING_STATUSES: PARequest['status'][] = [
  'pending',
  'checking_eligibility',
  'generating_request',
  'submitting',
  'more_info_needed',
];

function computeMetrics(
  paRequests: PARequest[],
  agentRuns: AgentRun[],
  patients: Patient[],
): Omit<PADashboardData, 'loading' | 'paRequests' | 'agentRuns' | 'patients'> {
  const totalPAs = paRequests.length;
  const approvedCount = paRequests.filter(pa => pa.status === 'approved').length;
  const deniedCount = paRequests.filter(pa => pa.status === 'denied').length;
  const pendingCount = paRequests.filter(pa => PENDING_STATUSES.includes(pa.status)).length;

  // Urgent = pending for > 24 hours
  const now = Date.now();
  const urgentPendingCount = paRequests.filter(pa => {
    if (!PENDING_STATUSES.includes(pa.status)) return false;
    const lastUpdated = new Date(pa.lastUpdated).getTime();
    return (now - lastUpdated) > 24 * 60 * 60 * 1000;
  }).length;

  // Approval rate: approved / (approved + denied) — excludes in-progress
  const decided = approvedCount + deniedCount;
  const approvalRate = decided > 0 ? Math.round((approvedCount / decided) * 100) : 0;

  // Average turnaround: for decided PAs that have a submittedAt
  const decidedPAs = paRequests.filter(
    pa => (pa.status === 'approved' || pa.status === 'denied') && pa.submittedAt
  );
  let avgTurnaroundHours = 0;
  if (decidedPAs.length > 0) {
    const totalHours = decidedPAs.reduce((sum, pa) => {
      const submitted = new Date(pa.submittedAt!).getTime();
      const resolved = new Date(pa.lastUpdated).getTime();
      return sum + (resolved - submitted) / (1000 * 60 * 60);
    }, 0);
    avgTurnaroundHours = Math.round((totalHours / decidedPAs.length) * 10) / 10;
  }

  // Agent metrics
  const totalAgentSlots = 8; // configurable capacity
  const activeAgents = agentRuns.filter(r => r.status === 'running').length;

  // System metrics (mock — these would come from a health endpoint)
  const apiUptime = 99.9;
  const queueDepth = pendingCount + activeAgents;

  // Build system status display items from computed data
  const systemStatuses: SystemStatusItem[] = [
    {
      title: 'AGENT BOTS',
      value: `${activeAgents}/${totalAgentSlots}`,
      status: activeAgents > 0 ? '[RUNNING...]' : '[IDLE]',
      variant: activeAgents > 0 ? 'success' : 'warning',
    },
    {
      title: 'API UPTIME',
      value: `${apiUptime}%`,
      status: apiUptime >= 99 ? '[HEALTHY]' : '[DEGRADED]',
      variant: apiUptime >= 99 ? 'success' : apiUptime >= 95 ? 'warning' : 'destructive',
    },
    {
      title: 'QUEUE DEPTH',
      value: String(queueDepth),
      status: queueDepth > 0 ? '[PROCESSING]' : '[EMPTY]',
      variant: queueDepth > 20 ? 'warning' : 'success',
    },
  ];

  return {
    totalPAs,
    approvedCount,
    deniedCount,
    pendingCount,
    urgentPendingCount,
    approvalRate,
    avgTurnaroundHours,
    totalAgentSlots,
    activeAgents,
    apiUptime,
    queueDepth,
    systemStatuses,
    teamPerformance: mockTeamPerformance,
    chartData: mockChartData,
  };
}

// ─── THE HOOK ───
export function usePADashboard(): PADashboardData {
  const [paRequests, setPARequests] = useState<PARequest[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getPARequests(),
      api.getAgentRuns(),
      api.getPatients(),
    ]).then(([pa, runs, pts]) => {
      setPARequests(pa);
      setAgentRuns(runs);
      setPatients(pts);
      setLoading(false);
    });
  }, []);

  const computed = useMemo(
    () => computeMetrics(paRequests, agentRuns, patients),
    [paRequests, agentRuns, patients]
  );

  return {
    loading,
    paRequests,
    agentRuns,
    patients,
    ...computed,
  };
}

// ─── CONTEXT (shared between Layout ↔ child pages) ───
export const PADashboardContext = createContext<PADashboardData | null>(null);

export function usePADashboardContext(): PADashboardData {
  const ctx = useContext(PADashboardContext);
  if (!ctx) throw new Error('usePADashboardContext must be used within PADashboardContext.Provider');
  return ctx;
}
