// TypeScript types mirroring backend models

export type PAStatus = 
  | 'pending' 
  | 'checking_eligibility' 
  | 'generating_request' 
  | 'submitting' 
  | 'approved' 
  | 'denied' 
  | 'more_info_needed';

export type AgentStatus = 'running' | 'completed' | 'failed';

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  memberId: string;
  insuranceProvider: string;
  chartUrl?: string;
  createdAt: string;
  providerName?: string;
  providerNpi?: string;
  practiceName?: string;
  planName?: string;
  procedureCode?: string;
  procedureName?: string;
  medicationName?: string;
}

export interface EligibilityResult {
  id: string;
  patientId: string;
  patientName: string;
  isEligible: boolean;
  coverageDetails?: string;
  checkDate: string;
  insuranceProvider: string;
}

export interface PARequest {
  id: string;
  patientId: string;
  patientName: string;
  procedureCode: string;
  procedureName: string;
  status: PAStatus;
  submittedAt?: string;
  lastUpdated: string;
  agentRunId?: string;
  denialReason?: string;
  approvalCode?: string;
}

export interface AgentRun {
  id: string;
  type: 'eligibility_check' | 'pa_submission' | 'status_check';
  status: AgentStatus;
  patientId: string;
  patientName: string;
  startedAt: string;
  completedAt?: string;
  logs: string[];
  result?: any;
}

export type WorkflowStageKey =
  | 'upload'
  | 'intake'
  | 'eligibility'
  | 'pa_submission'
  | 'status_monitor'
  | 'final_outcome';

export type WorkflowStageState = 'waiting' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface IntakeSessionTrace {
  sessionId: string;
  fileName: string;
  startedAt: string;
  updatedAt: string;
  lastPolledAt?: string;
  polling: boolean;
  mrn?: string;
  intakeAcceptedAt?: string;
  patientCreated?: boolean;
  patientUpdated?: boolean;
  missingFields: string[];
  stages: Record<WorkflowStageKey, WorkflowStageState>;
  stageDetails: Partial<Record<WorkflowStageKey, string>>;
  runIds: Partial<Record<'eligibility' | 'pa_submission' | 'status_monitor', string>>;
  lastError?: string;
  lastHttpStatus?: number;
}

export interface ApiHealth {
  status: 'ok' | 'offline';
  service: string;
  checkedAt: string;
  responseTimeMs?: number;
  apiBase: string;
}

export interface DashboardMetrics {
  totalPatients: number;
  pendingPAs: number;
  approvedPAs: number;
  deniedPAs: number;
  eligibilityChecks: number;
  activeAgents: number;
}
