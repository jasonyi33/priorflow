import { AgentRun, EligibilityResult, PARequest, Patient } from './types';

interface DemoSnapshot {
  patients: Patient[];
  eligibilityResults: EligibilityResult[];
  paRequests: PARequest[];
  agentRuns: AgentRun[];
}

const DEMO_PATIENTS: Patient[] = [
  {
    id: 'MRN-DEMO-001',
    name: 'Patient 01',
    dateOfBirth: '1988-04-12',
    memberId: 'MEM-0001',
    insuranceProvider: 'Aetna',
    chartUrl: '/api/patients/MRN-DEMO-001',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 01',
    providerNpi: '1234567890',
    practiceName: 'Practice 01',
    planName: 'Plan 01',
    medicationName: 'Skyrizi',
  },
  {
    id: 'MRN-DEMO-002',
    name: 'Patient 02',
    dateOfBirth: '1976-09-03',
    memberId: 'MEM-0002',
    insuranceProvider: 'UnitedHealthcare',
    chartUrl: '/api/patients/MRN-DEMO-002',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 02',
    providerNpi: '2345678901',
    practiceName: 'Practice 02',
    planName: 'Plan 02',
    procedureCode: '72148',
    procedureName: 'MRI lumbar spine without contrast',
  },
  {
    id: 'MRN-DEMO-003',
    name: 'Patient 03',
    dateOfBirth: '1991-12-19',
    memberId: 'MEM-0003',
    insuranceProvider: 'Blue Cross Blue Shield',
    chartUrl: '/api/patients/MRN-DEMO-003',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 03',
    providerNpi: '3456789012',
    practiceName: 'Practice 03',
    planName: 'Plan 03',
    medicationName: 'Aimovig',
  },
  {
    id: 'MRN-DEMO-004',
    name: 'Patient 04',
    dateOfBirth: '1969-06-08',
    memberId: 'MEM-0004',
    insuranceProvider: 'Cigna',
    chartUrl: '/api/patients/MRN-DEMO-004',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 04',
    providerNpi: '4567890123',
    practiceName: 'Practice 04',
    planName: 'Plan 04',
    procedureCode: '93015',
    procedureName: 'Cardiovascular stress test',
  },
  {
    id: 'MRN-DEMO-005',
    name: 'Patient 05',
    dateOfBirth: '1983-01-24',
    memberId: 'MEM-0005',
    insuranceProvider: 'Humana',
    chartUrl: '/api/patients/MRN-DEMO-005',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 05',
    providerNpi: '5678901234',
    practiceName: 'Practice 05',
    planName: 'Plan 05',
    procedureCode: '95810',
    procedureName: 'Diagnostic sleep study',
  },
  {
    id: 'MRN-DEMO-006',
    name: 'Patient 06',
    dateOfBirth: '1994-11-29',
    memberId: 'MEM-0006',
    insuranceProvider: 'Molina Healthcare',
    chartUrl: '/api/patients/MRN-DEMO-006',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 06',
    providerNpi: '6789012345',
    practiceName: 'Practice 06',
    planName: 'Plan 06',
    procedureCode: '43239',
    procedureName: 'Upper GI endoscopy with biopsy',
  },
  {
    id: 'MRN-DEMO-007',
    name: 'Patient 07',
    dateOfBirth: '1987-10-10',
    memberId: 'MEM-0007',
    insuranceProvider: 'Kaiser Permanente',
    chartUrl: '/api/patients/MRN-DEMO-007',
    createdAt: new Date().toISOString(),
    providerName: 'Provider 07',
    providerNpi: '7890123456',
    practiceName: 'Practice 07',
    planName: 'Plan 07',
    medicationName: 'Dupixent',
  },
];

function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function withFallbackPatients(sourcePatients: Patient[]): Patient[] {
  const combined = uniqueById([...sourcePatients, ...DEMO_PATIENTS]);
  return combined.slice(0, 7);
}

function labelForPatient(patient: Patient): { code: string; name: string } {
  if (patient.procedureName || patient.procedureCode) {
    return {
      code: patient.procedureCode || 'PROC',
      name: patient.procedureName || 'Procedure authorization',
    };
  }

  return {
    code: 'RX-PA',
    name: patient.medicationName ? `${patient.medicationName} prior authorization` : 'Medication prior authorization',
  };
}

export function buildDemoSnapshot(sourcePatients: Patient[]): DemoSnapshot {
  const patients = withFallbackPatients(sourcePatients);
  const [p0, p1, p2, p3, p4, p5, p6] = [
    patients[0],
    patients[1] || patients[0],
    patients[2] || patients[0],
    patients[3] || patients[1] || patients[0],
    patients[4] || patients[2] || patients[0],
    patients[5] || patients[3] || patients[0],
    patients[6] || patients[4] || patients[0],
  ];

  const paRequests: PARequest[] = [
    {
      id: 'demo-pa-approved',
      patientId: p0.id,
      patientName: p0.name,
      procedureCode: labelForPatient(p0).code,
      procedureName: labelForPatient(p0).name,
      status: 'approved',
      submittedAt: isoMinutesAgo(60 * 28),
      lastUpdated: isoMinutesAgo(60 * 6),
      agentRunId: 'demo-run-approved',
      approvalCode: 'AUTH-2026-1147',
    },
    {
      id: 'demo-pa-awaiting',
      patientId: p1.id,
      patientName: p1.name,
      procedureCode: labelForPatient(p1).code,
      procedureName: labelForPatient(p1).name,
      status: 'submitting',
      submittedAt: isoMinutesAgo(90),
      lastUpdated: isoMinutesAgo(14),
      agentRunId: 'demo-run-submitting',
    },
    {
      id: 'demo-pa-denied',
      patientId: p2.id,
      patientName: p2.name,
      procedureCode: labelForPatient(p2).code,
      procedureName: labelForPatient(p2).name,
      status: 'denied',
      submittedAt: isoMinutesAgo(60 * 44),
      lastUpdated: isoMinutesAgo(60 * 17),
      agentRunId: 'demo-run-denied',
      denialReason: 'Medical necessity not established. Payer requested failed step-therapy documentation.',
    },
    {
      id: 'demo-pa-info',
      patientId: p3.id,
      patientName: p3.name,
      procedureCode: labelForPatient(p3).code,
      procedureName: labelForPatient(p3).name,
      status: 'more_info_needed',
      submittedAt: isoMinutesAgo(60 * 10),
      lastUpdated: isoMinutesAgo(60 * 3),
      agentRunId: 'demo-run-info',
    },
    {
      id: 'demo-pa-eligibility',
      patientId: p4.id,
      patientName: p4.name,
      procedureCode: labelForPatient(p4).code,
      procedureName: labelForPatient(p4).name,
      status: 'checking_eligibility',
      lastUpdated: isoMinutesAgo(9),
      agentRunId: 'demo-run-eligibility',
    },
    {
      id: 'demo-pa-drafting',
      patientId: p5.id,
      patientName: p5.name,
      procedureCode: labelForPatient(p5).code,
      procedureName: labelForPatient(p5).name,
      status: 'generating_request',
      lastUpdated: isoMinutesAgo(22),
      agentRunId: 'demo-run-drafting',
    },
    {
      id: 'demo-pa-queued',
      patientId: p6.id,
      patientName: p6.name,
      procedureCode: '97110',
      procedureName: 'Therapeutic exercise authorization',
      status: 'pending',
      lastUpdated: isoMinutesAgo(37),
      agentRunId: 'demo-run-queued',
    },
  ];

  const eligibilityResults: EligibilityResult[] = [
    {
      id: 'demo-eligibility-1',
      patientId: p0.id,
      patientName: p0.name,
      isEligible: true,
      coverageDetails: `${p0.insuranceProvider} active coverage — specialist copay $30, PA required for biologics`,
      checkDate: isoMinutesAgo(60 * 7),
      insuranceProvider: p0.insuranceProvider,
    },
    {
      id: 'demo-eligibility-2',
      patientId: p1.id,
      patientName: p1.name,
      isEligible: true,
      coverageDetails: `${p1.insuranceProvider} active coverage — imaging requires prior authorization`,
      checkDate: isoMinutesAgo(48),
      insuranceProvider: p1.insuranceProvider,
    },
    {
      id: 'demo-eligibility-3',
      patientId: p2.id,
      patientName: p2.name,
      isEligible: false,
      coverageDetails: `${p2.insuranceProvider} coverage issue — subscriber plan inactive pending verification`,
      checkDate: isoMinutesAgo(60 * 14),
      insuranceProvider: p2.insuranceProvider,
    },
    {
      id: 'demo-eligibility-4',
      patientId: p3.id,
      patientName: p3.name,
      isEligible: true,
      coverageDetails: `${p3.insuranceProvider} active coverage — additional chart notes needed for specialty review`,
      checkDate: isoMinutesAgo(60 * 3),
      insuranceProvider: p3.insuranceProvider,
    },
    {
      id: 'demo-eligibility-5',
      patientId: p4.id,
      patientName: p4.name,
      isEligible: true,
      coverageDetails: `${p4.insuranceProvider} active coverage — benefits confirmed, eligibility bot still validating portal response`,
      checkDate: isoMinutesAgo(13),
      insuranceProvider: p4.insuranceProvider,
    },
    {
      id: 'demo-eligibility-6',
      patientId: p5.id,
      patientName: p5.name,
      isEligible: true,
      coverageDetails: `${p5.insuranceProvider} active coverage — deductible met, draft packet ready`,
      checkDate: isoMinutesAgo(31),
      insuranceProvider: p5.insuranceProvider,
    },
    {
      id: 'demo-eligibility-7',
      patientId: p6.id,
      patientName: p6.name,
      isEligible: true,
      coverageDetails: `${p6.insuranceProvider} active coverage — verification complete and queued for submission`,
      checkDate: isoMinutesAgo(19),
      insuranceProvider: p6.insuranceProvider,
    },
  ];

  const agentRuns: AgentRun[] = [
    {
      id: 'demo-run-approved',
      type: 'pa_submission',
      status: 'completed',
      patientId: p0.id,
      patientName: p0.name,
      startedAt: isoMinutesAgo(60 * 8),
      completedAt: isoMinutesAgo(60 * 6),
      logs: [
        'Opened CoverMyMeds and authenticated successfully.',
        'Mapped patient demographics, payer fields, and medication details.',
        'Submitted prior authorization packet and received approval response.',
      ],
      result: {
        approvalCode: 'AUTH-2026-1147',
        outcome: 'approved',
      },
    },
    {
      id: 'demo-run-submitting',
      type: 'pa_submission',
      status: 'running',
      patientId: p1.id,
      patientName: p1.name,
      startedAt: isoMinutesAgo(17),
      logs: [
        'Validated member coverage in payer portal.',
        'Uploading chart attachments and justification letter.',
        'Awaiting submission confirmation from payer.',
      ],
    },
    {
      id: 'demo-run-denied',
      type: 'status_check',
      status: 'completed',
      patientId: p2.id,
      patientName: p2.name,
      startedAt: isoMinutesAgo(60 * 19),
      completedAt: isoMinutesAgo(60 * 17),
      logs: [
        'Polled payer inbox for determination update.',
        'Detected denial notice and extracted rationale.',
        'Stored denial reason for clinical follow-up.',
      ],
      result: {
        outcome: 'denied',
        reason: 'Missing step-therapy documentation',
      },
    },
    {
      id: 'demo-run-info',
      type: 'status_check',
      status: 'completed',
      patientId: p3.id,
      patientName: p3.name,
      startedAt: isoMinutesAgo(60 * 4),
      completedAt: isoMinutesAgo(60 * 3),
      logs: [
        'Checked CoverMyMeds thread for updates.',
        'Payer requested additional office notes and recent labs.',
        'Flagged case as more info needed.',
      ],
      result: {
        outcome: 'more_info_needed',
      },
    },
    {
      id: 'demo-run-eligibility',
      type: 'eligibility_check',
      status: 'running',
      patientId: p4.id,
      patientName: p4.name,
      startedAt: isoMinutesAgo(11),
      logs: [
        'Connecting to eligibility endpoint.',
        'Verifying deductible and benefit status.',
        'Waiting for portal confirmation.',
      ],
    },
    {
      id: 'demo-run-drafting',
      type: 'pa_submission',
      status: 'running',
      patientId: p5.id,
      patientName: p5.name,
      startedAt: isoMinutesAgo(24),
      logs: [
        'Summarizing prior therapies from chart.',
        'Generating clinical justification.',
        'Preparing payer-specific response fields.',
      ],
    },
    {
      id: 'demo-run-queued',
      type: 'pa_submission',
      status: 'failed',
      patientId: p6.id,
      patientName: p6.name,
      startedAt: isoMinutesAgo(43),
      completedAt: isoMinutesAgo(38),
      logs: [
        'Started queue processing for follow-up request.',
        'Portal session expired before submission.',
        'Run failed and was re-queued for retry.',
      ],
      result: {
        outcome: 'retry_required',
      },
    },
  ];

  return {
    patients,
    eligibilityResults,
    paRequests,
    agentRuns,
  };
}
