/**
 * API client for the FastAPI backend.
 *
 * Dev 4: Use these functions to call backend endpoints.
 * All endpoints return typed responses matching shared/models.py.
 */

import type {
  PatientChart,
  EligibilityResult,
  PARequest,
  AgentRun,
  APIResponse,
  Portal,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Patients ──

export async function listPatients(): Promise<PatientChart[]> {
  return fetchJSON(`${API_BASE}/patients`);
}

export async function getPatient(mrn: string): Promise<PatientChart> {
  return fetchJSON(`${API_BASE}/patients/${mrn}`);
}

export async function uploadChart(chart: PatientChart): Promise<APIResponse> {
  return fetchJSON(`${API_BASE}/patients`, {
    method: "POST",
    body: JSON.stringify(chart),
  });
}

// ── Eligibility ──

export async function triggerEligibilityCheck(
  mrn: string,
  portal: Portal = "stedi"
): Promise<APIResponse> {
  return fetchJSON(`${API_BASE}/eligibility/check`, {
    method: "POST",
    body: JSON.stringify({ mrn, portal }),
  });
}

export async function getEligibility(mrn: string): Promise<EligibilityResult[]> {
  return fetchJSON(`${API_BASE}/eligibility/${mrn}`);
}

// ── PA Requests ──

export async function triggerPASubmission(
  mrn: string,
  portal: Portal = "covermymeds"
): Promise<APIResponse> {
  return fetchJSON(`${API_BASE}/pa/submit`, {
    method: "POST",
    body: JSON.stringify({ mrn, portal }),
  });
}

export async function listPARequests(
  mrn?: string,
  status?: string
): Promise<PARequest[]> {
  const params = new URLSearchParams();
  if (mrn) params.set("mrn", mrn);
  if (status) params.set("status", status);
  const query = params.toString();
  return fetchJSON(`${API_BASE}/pa${query ? `?${query}` : ""}`);
}

export async function triggerStatusCheck(
  mrn: string,
  portal?: Portal
): Promise<APIResponse> {
  return fetchJSON(`${API_BASE}/pa/status/check`, {
    method: "POST",
    body: JSON.stringify({ mrn, portal }),
  });
}

// ── Agent Runs ──

export async function listAgentRuns(
  mrn?: string,
  type?: string
): Promise<AgentRun[]> {
  const params = new URLSearchParams();
  if (mrn) params.set("mrn", mrn);
  if (type) params.set("type", type);
  const query = params.toString();
  return fetchJSON(`${API_BASE}/agents/runs${query ? `?${query}` : ""}`);
}
