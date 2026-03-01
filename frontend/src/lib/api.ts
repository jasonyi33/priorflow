// API client for the PA lifecycle system
// Calls the FastAPI backend at localhost:8000

import {
  Patient,
  EligibilityResult,
  PARequest,
  PAStatus,
  AgentRun,
  DashboardMetrics,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Transformers: backend shapes → frontend types ───

function toPatient(chart: any): Patient {
  // Backend returns full PatientChart objects with nested structure
  if (chart.patient) {
    return {
      id: chart.patient.mrn,
      name: chart.patient.name,
      dateOfBirth: chart.patient.dob,
      memberId: chart.insurance.member_id,
      insuranceProvider: chart.insurance.payer,
      createdAt: new Date().toISOString(),
    };
  }
  // Convex format uses flat camelCase fields
  return {
    id: chart.mrn || chart._id,
    name: `${chart.firstName} ${chart.lastName}`,
    dateOfBirth: chart.dob,
    memberId: chart.insurance?.memberId || '',
    insuranceProvider: chart.insurance?.payer || '',
    createdAt: chart._creationTime ? new Date(chart._creationTime).toISOString() : new Date().toISOString(),
  };
}

function toEligibilityResult(data: any, patientName?: string): EligibilityResult {
  const details = [
    data.copay,
    data.deductible,
    data.pa_required ? `PA required: ${data.pa_required_reason || 'yes'}` : null,
  ].filter(Boolean).join(' — ');

  return {
    id: `eli-${data.mrn}-${data.checked_at || Date.now()}`,
    patientId: data.mrn,
    patientName: patientName || data.mrn,
    isEligible: data.coverage_active,
    coverageDetails: details || undefined,
    checkDate: data.checked_at || new Date().toISOString(),
    insuranceProvider: data.payer,
  };
}

const PA_STATUS_MAP: Record<string, PAStatus> = {
  pending: 'pending',
  submitted: 'submitting',
  approved: 'approved',
  denied: 'denied',
  more_info_needed: 'more_info_needed',
  cancelled: 'denied',
};

function toPARequest(data: any): PARequest {
  return {
    id: data.id || data.submission_id || `pa-${data.mrn}`,
    patientId: data.mrn,
    patientName: data.mrn,
    procedureCode: data.diagnosis?.icd10 || '',
    procedureName: data.medication_or_procedure || '',
    status: PA_STATUS_MAP[data.status] || 'pending',
    submittedAt: data.created_at,
    lastUpdated: data.updated_at || data.created_at,
    denialReason: data.gaps_detected?.length ? data.gaps_detected.join(', ') : undefined,
    approvalCode: data.submission_id,
  };
}

const AGENT_TYPE_MAP: Record<string, AgentRun['type']> = {
  eligibility: 'eligibility_check',
  pa_form_filler: 'pa_submission',
  status_monitor: 'status_check',
};

function toAgentRun(data: any): AgentRun {
  let status: AgentRun['status'];
  if (data.completed_at && data.success === true) status = 'completed';
  else if (data.completed_at && data.success === false) status = 'failed';
  else status = 'running';

  return {
    id: data.id || `run-${data.started_at}`,
    type: AGENT_TYPE_MAP[data.agent_type] || 'pa_submission',
    status,
    patientId: data.mrn,
    patientName: data.mrn,
    startedAt: data.started_at,
    completedAt: data.completed_at || undefined,
    logs: data.error_message
      ? [data.error_message]
      : [`${data.steps_taken ?? 0}/${data.max_steps ?? 25} steps completed`],
    result: data.gif_path ? { gifPath: data.gif_path } : undefined,
  };
}

// ─── Cached patients for name lookups ───

let cachedPatients: Patient[] | null = null;

async function getCachedPatients(): Promise<Patient[]> {
  if (!cachedPatients) {
    cachedPatients = await api.getPatients();
  }
  return cachedPatients;
}

function getPatientName(patients: Patient[], mrn: string): string {
  return patients.find(p => p.id === mrn)?.name || mrn;
}

// ─── API ───

export const api = {
  // Dashboard metrics — computed from raw data
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [patients, paRequests, agentRuns] = await Promise.all([
      api.getPatients(),
      api.getPARequests(),
      api.getAgentRuns(),
    ]);
    return {
      totalPatients: patients.length,
      pendingPAs: paRequests.filter(pa => ['pending', 'submitting', 'checking_eligibility', 'generating_request', 'more_info_needed'].includes(pa.status)).length,
      approvedPAs: paRequests.filter(pa => pa.status === 'approved').length,
      deniedPAs: paRequests.filter(pa => pa.status === 'denied').length,
      eligibilityChecks: 0,
      activeAgents: agentRuns.filter(r => r.status === 'running').length,
    };
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    const charts = await fetchJSON<any[]>('/patients');
    const patients = charts.map(toPatient);
    cachedPatients = patients;
    return patients;
  },

  async getPatient(id: string): Promise<Patient | undefined> {
    try {
      const chart = await fetchJSON<any>(`/patients/${id}`);
      return toPatient(chart);
    } catch {
      return undefined;
    }
  },

  async uploadChart(patientId: string, file: File): Promise<{ success: boolean; chartUrl: string }> {
    const data = await api.uploadPdfAndStartFlow(file);
    return {
      success: data.success,
      chartUrl: `data/charts/${data.mrn || patientId}.json`,
    };
  },

  async uploadPdfAndStartFlow(file: File): Promise<{
    success: boolean;
    mrn: string;
    patientCreated: boolean;
    patientUpdated: boolean;
    flowStarted: boolean;
    missingFields: string[];
  }> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/intake/pdf`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const err = await res.json();
        detail = err?.detail || err?.message || detail;
      } catch {
        // keep statusText fallback
      }
      throw new Error(`API ${res.status}: ${detail}`);
    }
    const payload = await res.json();
    return {
      success: !!payload?.success,
      mrn: payload?.data?.mrn || '',
      patientCreated: !!payload?.data?.patient_created,
      patientUpdated: !!payload?.data?.patient_updated,
      flowStarted: !!payload?.data?.flow_started,
      missingFields: payload?.data?.missing_fields || [],
    };
  },

  // Eligibility
  async getEligibilityResults(): Promise<EligibilityResult[]> {
    const patients = await getCachedPatients();
    const results: EligibilityResult[] = [];

    const fetches = patients.map(async (patient) => {
      try {
        const data = await fetchJSON<any[]>(`/eligibility/${patient.id}`);
        for (const item of data) {
          results.push(toEligibilityResult(item, patient.name));
        }
      } catch {
        // No eligibility data for this patient
      }
    });

    await Promise.all(fetches);
    return results;
  },

  async checkEligibility(patientId: string): Promise<EligibilityResult> {
    const response = await fetchJSON<{ success: boolean; data: { run_id: string; mrn: string } }>(
      '/eligibility/check',
      { method: 'POST', body: JSON.stringify({ mrn: patientId, portal: 'stedi' }) },
    );

    const patients = await getCachedPatients();
    const patientName = getPatientName(patients, patientId);
    const runId = response.data.run_id;

    // Poll for agent completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 3000));
      attempts++;
      try {
        const run = await fetchJSON<any>(`/agents/runs/${runId}`);
        if (run.completed_at || run.success !== null) {
          const data = await fetchJSON<any[]>(`/eligibility/${patientId}`);
          if (data.length > 0) {
            return toEligibilityResult(data[data.length - 1], patientName);
          }
          break;
        }
      } catch {
        // Run not found yet
      }
    }

    return {
      id: `eli-${patientId}-${Date.now()}`,
      patientId,
      patientName,
      isEligible: false,
      coverageDetails: 'Check in progress — refresh to see results',
      checkDate: new Date().toISOString(),
      insuranceProvider: 'Checking...',
    };
  },

  // PA Requests
  async getPARequests(): Promise<PARequest[]> {
    const data = await fetchJSON<any[]>('/pa');
    const patients = await getCachedPatients();
    return data.map(item => {
      const pa = toPARequest(item);
      pa.patientName = getPatientName(patients, pa.patientId);
      return pa;
    });
  },

  async getPARequest(id: string): Promise<PARequest | undefined> {
    try {
      const data = await fetchJSON<any>(`/pa/${id}`);
      const patients = await getCachedPatients();
      const pa = toPARequest(data);
      pa.patientName = getPatientName(patients, pa.patientId);
      return pa;
    } catch {
      return undefined;
    }
  },

  async createPARequest(data: {
    patientId: string;
    procedureCode: string;
    procedureName: string;
  }): Promise<PARequest> {
    const response = await fetchJSON<{ success: boolean; data: { run_id: string; mrn: string } }>(
      '/pa/submit',
      { method: 'POST', body: JSON.stringify({ mrn: data.patientId, portal: 'covermymeds' }) },
    );

    return {
      id: response.data.run_id,
      patientId: data.patientId,
      patientName: data.patientId,
      procedureCode: data.procedureCode,
      procedureName: data.procedureName,
      status: 'pending',
      lastUpdated: new Date().toISOString(),
      agentRunId: response.data.run_id,
    };
  },

  // Agent Runs
  async getAgentRuns(): Promise<AgentRun[]> {
    const data = await fetchJSON<any[]>('/agents/runs');
    const patients = await getCachedPatients();
    return data.map(item => {
      const run = toAgentRun(item);
      run.patientName = getPatientName(patients, run.patientId);
      return run;
    });
  },

  async getAgentRun(id: string): Promise<AgentRun | undefined> {
    try {
      const data = await fetchJSON<any>(`/agents/runs/${id}`);
      const patients = await getCachedPatients();
      const run = toAgentRun(data);
      run.patientName = getPatientName(patients, run.patientId);
      return run;
    } catch {
      return undefined;
    }
  },
};
