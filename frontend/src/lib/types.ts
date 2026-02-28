/**
 * Frontend TypeScript types — mirrors shared/models.py
 *
 * These types define the data shapes for API responses and Convex documents.
 * Dev 4 uses these for component props and API client return types.
 *
 * IMPORTANT: Keep in sync with shared/models.py and convex/schema.ts
 */

// Enums
export type PAStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "denied"
  | "more_info_needed"
  | "cancelled";

export type AgentType = "eligibility" | "pa_form_filler" | "status_monitor";

export type Portal = "stedi" | "claimmd" | "covermymeds" | "flexpa" | "mock";

export type AlertEventType =
  | "approved"
  | "denied"
  | "delayed"
  | "error"
  | "submitted";

// Patient chart
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
  medication?: MedicationInfo;
  procedure?: ProcedureInfo;
  prior_therapies: string[];
  labs: Record<string, string>;
  imaging: Record<string, string>;
  provider: ProviderInfo;
}

// Cross-agent data
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

// API response
export interface APIResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}
