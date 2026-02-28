export type PAStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "denied"
  | "more_info_needed"
  | "cancelled";

export type AgentType = "eligibility" | "pa_form_filler" | "status_monitor";

export type Portal = "stedi" | "claimmd" | "covermymeds" | "mock";

export type AlertEventType =
  | "approved"
  | "denied"
  | "delayed"
  | "error"
  | "submitted";

export interface PatientInfo {
  name: string;
  first_name: string;
  last_name: string;
  dob: string;
  mrn: string;
}

export interface InsuranceInfo {
  payer: string;
  member_id: string;
  bin: string;
  pcn: string;
  rx_group: string;
  plan_name?: string;
}

export interface DiagnosisInfo {
  icd10: string;
  description: string;
}

export interface MedicationInfo {
  name: string;
  ndc?: string;
  dose: string;
  frequency: string;
}

export interface ProcedureInfo {
  cpt: string;
  description: string;
}

export interface ProviderInfo {
  name: string;
  npi: string;
  practice: string;
  phone: string;
  fax: string;
}

export interface PatientChart {
  patient: PatientInfo;
  insurance: InsuranceInfo;
  diagnosis: DiagnosisInfo;
  medication?: MedicationInfo | null;
  procedure?: ProcedureInfo | null;
  prior_therapies: string[];
  labs: Record<string, string>;
  imaging: Record<string, string>;
  provider: ProviderInfo;
}

export interface EligibilityResult {
  mrn: string;
  portal: Portal;
  payer: string;
  coverage_active: boolean;
  copay?: string;
  deductible?: string;
  out_of_pocket_max?: string;
  pa_required: boolean;
  pa_required_reason?: string;
  raw_response?: string;
  checked_at: string;
}

export interface PARequest {
  id?: string;
  mrn: string;
  portal: Portal;
  medication_or_procedure: string;
  status: PAStatus;
  fields_filled: string[];
  gaps_detected: string[];
  justification_summary?: string;
  submission_id?: string;
  gif_path?: string;
  created_at: string;
  updated_at: string;
}

export interface PAStatusUpdate {
  request_id: string;
  mrn: string;
  portal: Portal;
  status: PAStatus;
  determination_date?: string;
  denial_reason?: string;
  notes?: string;
  checked_at: string;
}

export interface AgentRun {
  id?: string;
  agent_type: AgentType;
  mrn: string;
  portal: Portal;
  started_at: string;
  completed_at?: string;
  steps_taken: number;
  max_steps: number;
  success?: boolean;
  error_message?: string;
  gif_path?: string;
}
