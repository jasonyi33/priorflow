// API client for the PA lifecycle system
// Calls the FastAPI backend at localhost:8000

import {
  Patient,
  EligibilityResult,
  PARequest,
  PAStatus,
  AgentRun,
  DashboardMetrics,
  ApiHealth,
} from './types';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Transformers: backend shapes → frontend types ───

function toISOString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toPatient(chart: any): Patient {
  // Backend returns full PatientChart objects with nested structure
  if (chart.patient) {
    const mrn = chart.patient.mrn;
    const createdAt = chart.created_at || chart.createdAt || chart._creationTime;
    return {
      id: mrn,
      name: chart.patient.name,
      dateOfBirth: chart.patient.dob,
      memberId: chart.insurance.member_id,
      insuranceProvider: chart.insurance.payer,
      chartUrl: `${API_BASE}/patients/${mrn}`,
      // Keep deterministic fallback so records do not appear "new" on every poll.
      createdAt: createdAt ? toISOString(createdAt) : '1970-01-01T00:00:00.000Z',
      providerName: chart.provider?.name,
      providerNpi: chart.provider?.npi,
      practiceName: chart.provider?.practice,
      planName: chart.insurance?.plan_name,
      procedureCode: chart.procedure?.cpt,
      procedureName: chart.procedure?.description,
      medicationName: chart.medication?.name,
    };
  }
  // Convex format uses flat camelCase fields
  const mrn = chart.mrn || chart._id;
  return {
    id: mrn,
    name: `${chart.firstName} ${chart.lastName}`,
    dateOfBirth: chart.dob,
    memberId: chart.insurance?.memberId || '',
    insuranceProvider: chart.insurance?.payer || '',
    chartUrl: chart.chartJson || chart.mrn ? `${API_BASE}/patients/${mrn}` : undefined,
    createdAt: chart._creationTime
      ? new Date(chart._creationTime).toISOString()
      : chart.createdAt || '1970-01-01T00:00:00.000Z',
    providerName: chart.provider?.name,
    providerNpi: chart.provider?.npi,
    practiceName: chart.provider?.practice,
    planName: chart.insurance?.planName || chart.insurance?.plan_name,
    procedureCode: chart.procedure?.cpt,
    procedureName: chart.procedure?.description,
    medicationName: chart.medication?.name,
  };
}

function toEligibilityResult(data: any, patientName?: string): EligibilityResult {
  const paRequired = data.pa_required ?? data.paRequired;
  const paReason = data.pa_required_reason ?? data.paRequiredReason;
  const checkedAt = data.checked_at ?? data.checkedAt;
  const coverageActive = data.coverage_active ?? data.coverageActive;
  const details = [
    data.copay,
    data.deductible,
    paRequired ? `PA required: ${paReason || 'yes'}` : null,
  ].filter(Boolean).join(' — ');

  return {
    id: `eli-${data.mrn}-${checkedAt || Date.now()}`,
    patientId: data.mrn,
    patientName: patientName || data.mrn,
    isEligible: Boolean(coverageActive),
    coverageDetails: details || undefined,
    checkDate: toISOString(checkedAt),
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
  const medicationOrProcedure = data.medication_or_procedure || data.medicationOrProcedure || '';
  const createdAt = data.created_at || data.createdAt;
  const updatedAt = data.updated_at || data.updatedAt || createdAt;
  const gapsDetected = data.gaps_detected || data.gapsDetected || [];
  const submissionId = data.submission_id || data.submissionId;
  return {
    id: data.id || data._id || submissionId || `pa-${data.mrn}`,
    patientId: data.mrn,
    patientName: data.mrn,
    procedureCode: data.diagnosis?.icd10 || '',
    procedureName: medicationOrProcedure,
    status: PA_STATUS_MAP[data.status] || 'pending',
    submittedAt: toISOString(createdAt),
    lastUpdated: toISOString(updatedAt),
    agentRunId: data.run_id || data.runId || undefined,
    denialReason: gapsDetected.length ? gapsDetected.join(', ') : undefined,
    approvalCode: submissionId,
  };
}

const AGENT_TYPE_MAP: Record<string, AgentRun['type']> = {
  eligibility: 'eligibility_check',
  pa_form_filler: 'pa_submission',
  status_monitor: 'status_check',
};

function toAgentRun(data: any): AgentRun {
  let status: AgentRun['status'];
  const completedAt = data.completed_at || data.completedAt;
  const success = data.success;
  if (data.status === 'completed' && success !== false) status = 'completed';
  else if (data.status === 'failed' || (completedAt && success === false)) status = 'failed';
  else if (completedAt && success === true) status = 'completed';
  else if (completedAt) status = success === false ? 'failed' : 'completed';
  else status = 'running';

  // Use backend logs array if available, otherwise generate a summary line
  let logs: string[];
  if (Array.isArray(data.logs) && data.logs.length > 0) {
    logs = data.logs;
  } else if (data.error_message) {
    logs = [data.error_message];
  } else {
    logs = [`${data.steps_taken ?? 0}/${data.max_steps ?? 25} steps completed`];
  }

  // Build result object with gif download URL if available
  let result: any = undefined;
  const gifPath = data.gif_path || data.gifPath;
  if (gifPath) {
    const gifFilename = gifPath.split('/').pop();
    result = { gifPath, gifUrl: `/api/agents/gif/${gifFilename}` };
  }

  return {
    id: data.id || data.run_id || `run-${data.started_at}`,
    type: AGENT_TYPE_MAP[data.agent_type] || AGENT_TYPE_MAP[data.agentType] || 'pa_submission',
    status,
    patientId: data.mrn,
    patientName: data.mrn,
    startedAt: toISOString(data.started_at || data.startedAt),
    completedAt: (data.completed_at || data.completedAt) ? toISOString(data.completed_at || data.completedAt) : undefined,
    logs,
    result,
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

function deduplicateByPatient(results: EligibilityResult[]): EligibilityResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.patientId)) return false;
    seen.add(r.patientId);
    return true;
  });
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
    // Prefer direct list endpoint so eligibility can render even when patients table is sparse.
    try {
      const data = await fetchJSON<any[]>('/eligibility');
      const sorted = data
        .map((item) => toEligibilityResult(item, getPatientName(patients, item.mrn)))
        .sort((a, b) => new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime());
      return deduplicateByPatient(sorted);
    } catch {
      // Backward-compatible fallback for older backends without /eligibility list.
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
      const sorted = results.sort(
        (a, b) => new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime()
      );
      return deduplicateByPatient(sorted);
    }
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
    }).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
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
    }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
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

  async getHealth(): Promise<ApiHealth> {
    const startedAt = performance.now();

    try {
      const data = await fetchJSON<{ status?: string; service?: string }>('/health');
      return {
        status: data.status === 'ok' ? 'ok' : 'offline',
        service: data.service || 'priorflow',
        checkedAt: new Date().toISOString(),
        responseTimeMs: Math.round(performance.now() - startedAt),
        apiBase: API_BASE,
      };
    } catch {
      return {
        status: 'offline',
        service: 'priorflow',
        checkedAt: new Date().toISOString(),
        responseTimeMs: Math.round(performance.now() - startedAt),
        apiBase: API_BASE,
      };
    }
  },
};
