import { AgentRun, EligibilityResult, PARequest, Patient } from './types';

export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
}

function toTimestamp(value?: string): number {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getAgentTypeLabel(type: AgentRun['type']): string {
  if (type === 'eligibility_check') return 'Eligibility Check';
  if (type === 'pa_submission') return 'PA Submission';
  if (type === 'status_check') return 'Status Check';
  return type;
}

export function getPrimaryProvider(patients: Patient[]): {
  providerName?: string;
  practiceName?: string;
  providerNpi?: string;
} {
  const counts = new Map<string, { count: number; providerName?: string; practiceName?: string; providerNpi?: string }>();

  for (const patient of patients) {
    const key = patient.providerName || patient.practiceName || patient.providerNpi;
    if (!key) continue;
    const existing = counts.get(key);
    counts.set(key, {
      count: (existing?.count || 0) + 1,
      providerName: patient.providerName || existing?.providerName,
      practiceName: patient.practiceName || existing?.practiceName,
      providerNpi: patient.providerNpi || existing?.providerNpi,
    });
  }

  const top = [...counts.values()].sort((a, b) => b.count - a.count)[0];
  return top || {};
}

export function getInitials(value?: string): string {
  if (!value) return 'PF';

  const letters = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join('');

  return letters || value.slice(0, 2).toUpperCase();
}

export function buildLiveNotifications(params: {
  paRequests: PARequest[];
  agentRuns: AgentRun[];
  eligibilityResults: EligibilityResult[];
}): LiveNotification[] {
  const paNotifications = params.paRequests.slice(0, 8).map((request) => ({
    id: `pa-${request.id}-${request.status}`,
    title:
      request.status === 'approved'
        ? 'PA APPROVED'
        : request.status === 'denied'
        ? 'PA DENIED'
        : request.status === 'more_info_needed'
        ? 'MORE INFO NEEDED'
        : 'PA IN FLIGHT',
    message: `${request.patientName} · ${request.procedureName || request.procedureCode || 'Prior authorization request'}`,
    timestamp: request.lastUpdated || request.submittedAt || new Date().toISOString(),
    type:
      request.status === 'approved'
        ? 'success'
        : request.status === 'denied'
        ? 'error'
        : request.status === 'more_info_needed'
        ? 'warning'
        : 'info',
    priority:
      request.status === 'denied' || request.status === 'more_info_needed'
        ? 'high'
        : request.status === 'approved'
        ? 'medium'
        : 'low',
  }));

  const runNotifications = params.agentRuns.slice(0, 8).map((run) => ({
    id: `run-${run.id}-${run.status}`,
    title: `${getAgentTypeLabel(run.type).toUpperCase()} ${run.status === 'running' ? 'RUNNING' : run.status === 'completed' ? 'COMPLETED' : 'FAILED'}`,
    message: `${run.patientName} · ${run.logs[run.logs.length - 1] || 'No log output yet'}`,
    timestamp: run.completedAt || run.startedAt,
    type: run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'info',
    priority: run.status === 'failed' ? 'high' : run.status === 'running' ? 'low' : 'medium',
  }));

  const eligibilityNotifications = params.eligibilityResults.slice(0, 6).map((result) => ({
    id: `eligibility-${result.id}`,
    title: result.isEligible ? 'ELIGIBILITY VERIFIED' : 'ELIGIBILITY ISSUE',
    message: `${result.patientName} · ${result.insuranceProvider}`,
    timestamp: result.checkDate,
    type: result.isEligible ? 'info' : 'warning',
    priority: result.isEligible ? 'low' : 'medium',
  }));

  return [...paNotifications, ...runNotifications, ...eligibilityNotifications]
    .sort((a, b) => toTimestamp(b.timestamp) - toTimestamp(a.timestamp))
    .slice(0, 24);
}
