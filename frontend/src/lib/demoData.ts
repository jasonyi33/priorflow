import { AgentRun, EligibilityResult, PARequest, Patient } from './types';

interface DemoSnapshot {
  patients: Patient[];
  eligibilityResults: EligibilityResult[];
  paRequests: PARequest[];
  agentRuns: AgentRun[];
}

const DEMO_PATIENTS: Patient[] = [
  {
    id: 'MRN-00991',
    name: 'Nina Patel',
    dateOfBirth: '1988-04-12',
    memberId: 'AET-4492018',
    insuranceProvider: 'Aetna',
    chartUrl: '/api/patients/MRN-00991',
    createdAt: new Date().toISOString(),
    providerName: 'Dr. Sarah Smith',
    providerNpi: '1234567890',
    practiceName: 'Metro Health Rheumatology',
    planName: 'Aetna Choice POS II',
    medicationName: 'Skyrizi',
  },
  {
    id: 'MRN-00992',
    name: 'Marcus Rivera',
    dateOfBirth: '1976-09-03',
    memberId: 'UHC-5542009',
    insuranceProvider: 'UnitedHealthcare',
    chartUrl: '/api/patients/MRN-00992',
    createdAt: new Date().toISOString(),
    providerName: 'Dr. Michael Torres',
    providerNpi: '2345678901',
    practiceName: 'Metro Health Orthopedics',
    planName: 'UHC Choice Plus',
    procedureCode: '72148',
    procedureName: 'MRI lumbar spine without contrast',
  },
  {
    id: 'MRN-00993',
    name: 'Alana Brooks',
    dateOfBirth: '1991-12-19',
    memberId: 'BCBS-8842004',
    insuranceProvider: 'Blue Cross Blue Shield',
    chartUrl: '/api/patients/MRN-00993',
    createdAt: new Date().toISOString(),
    providerName: 'Dr. Erica Vaughn',
    providerNpi: '3456789012',
    practiceName: 'Westlake Neurology',
    planName: 'Blue PPO',
    medicationName: 'Aimovig',
  },
  {
    id: 'MRN-00994',
    name: 'Jordan Ellis',
    dateOfBirth: '1969-06-08',
    memberId: 'CIG-4127781',
    insuranceProvider: 'Cigna',
    chartUrl: '/api/patients/MRN-00994',
    createdAt: new Date().toISOString(),
    providerName: 'Dr. Allison Reed',
    providerNpi: '4567890123',
    practiceName: 'Bayview Cardiology',
    planName: 'Cigna Open Access Plus',
    procedureCode: '93015',
    procedureName: 'Cardiovascular stress test',
  },
  {
    id: 'MRN-00995',
    name: 'Monica Alvarez',
    dateOfBirth: '1983-01-24',
    memberId: 'HUM-1187234',
    insuranceProvider: 'Humana',
    chartUrl: '/api/patients/MRN-00995',
    createdAt: new Date().toISOString(),
    providerName: 'Dr. Lena Park',
    providerNpi: '5678901234',
    practiceName: 'Northshore Sleep Medicine',
    planName: 'Humana Gold Plus',
    procedureCode: '95810',
    procedureName: 'Diagnostic sleep study',
  },
  {
    id: 'MRN-00996',
    name: 'Theo Grant',
    dateOfBirth: '1994-11-29',
    memberId: 'MOL-9011450',
    insuranceProvider: 'Molina Healthcare',
    chartUrl: '/api/patients/MRN-00996',
    createdAt: new Date().toISOString(),
    providerName: 'Dr. Hannah Cole',
    providerNpi: '6789012345',
    practiceName: 'Metro GI Associates',
    planName: 'Molina Marketplace Silver',
    procedureCode: '43239',
    procedureName: 'Upper GI endoscopy with biopsy',
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
  return combined.slice(0, Math.max(combined.length, 6));
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
  const [p0, p1, p2, p3, p4, p5] = [
    patients[0],
    patients[1] || patients[0],
    patients[2] || patients[0],
    patients[3] || patients[1] || patients[0],
    patients[4] || patients[2] || patients[0],
    patients[5] || patients[3] || patients[0],
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
      patientId: p0.id,
      patientName: p0.name,
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
      patientId: p0.id,
      patientName: p0.name,
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
