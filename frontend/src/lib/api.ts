// API client for the PA lifecycle system
// Uses mock data for demonstration purposes

import { 
  Patient, 
  EligibilityResult, 
  PARequest, 
  AgentRun, 
  DashboardMetrics 
} from './types';
import {
  mockPatients,
  mockEligibilityResults,
  mockPARequests,
  mockAgentRuns,
  mockDashboardMetrics,
} from './mockData';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Dashboard metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay(300);
    return mockDashboardMetrics;
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    await delay(400);
    return mockPatients;
  },

  async getPatient(id: string): Promise<Patient | undefined> {
    await delay(300);
    return mockPatients.find(p => p.id === id);
  },

  async uploadChart(patientId: string, file: File): Promise<{ success: boolean; chartUrl: string }> {
    await delay(1500);
    // Simulate file upload
    return {
      success: true,
      chartUrl: `https://example.com/charts/${patientId}.pdf`,
    };
  },

  // Eligibility
  async getEligibilityResults(): Promise<EligibilityResult[]> {
    await delay(400);
    return mockEligibilityResults;
  },

  async checkEligibility(patientId: string): Promise<EligibilityResult> {
    await delay(2000);
    // Return existing or create new eligibility result
    const existing = mockEligibilityResults.find(e => e.patientId === patientId);
    if (existing) return existing;

    const patient = mockPatients.find(p => p.id === patientId);
    return {
      id: `eli-${Date.now()}`,
      patientId,
      patientName: patient?.name || 'Unknown',
      isEligible: Math.random() > 0.3,
      coverageDetails: 'Active coverage',
      checkDate: new Date().toISOString(),
      insuranceProvider: patient?.insuranceProvider || 'Unknown',
    };
  },

  // PA Requests
  async getPARequests(): Promise<PARequest[]> {
    await delay(400);
    return mockPARequests;
  },

  async getPARequest(id: string): Promise<PARequest | undefined> {
    await delay(300);
    return mockPARequests.find(pa => pa.id === id);
  },

  async createPARequest(data: {
    patientId: string;
    procedureCode: string;
    procedureName: string;
  }): Promise<PARequest> {
    await delay(1000);
    const patient = mockPatients.find(p => p.id === data.patientId);
    return {
      id: `pa-${Date.now()}`,
      ...data,
      patientName: patient?.name || 'Unknown',
      status: 'pending',
      lastUpdated: new Date().toISOString(),
    };
  },

  // Agent Runs
  async getAgentRuns(): Promise<AgentRun[]> {
    await delay(400);
    return mockAgentRuns;
  },

  async getAgentRun(id: string): Promise<AgentRun | undefined> {
    await delay(300);
    return mockAgentRuns.find(run => run.id === id);
  },
};
