import Link from "next/link";
import { getPatientByMrn, getEligibilityByMrn, getPARequestsByMrn, getAgentRunsByMrn } from "@/lib/data/fixtures";
import { EligibilityResultCard } from "@/components/eligibility-result-card";
import { PARequestCard } from "@/components/pa-request-card";
import { AgentActivityFeed } from "@/components/agent-activity-feed";

export default async function PatientDetailPage({ params }: { params: Promise<{ mrn: string }> }) {
  const { mrn } = await params;
  const chart = getPatientByMrn(mrn);

  if (!chart) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Patient not found: {mrn}</p>
        <Link href="/patients" className="text-primary text-sm hover:underline mt-2 inline-block">
          Back to patients
        </Link>
      </div>
    );
  }

  const eligibility = getEligibilityByMrn(mrn);
  const paRequests = getPARequestsByMrn(mrn);
  const agentRuns = getAgentRunsByMrn(mrn);

  return (
    <div className="p-8 max-w-6xl">
      <Link href="/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to patients
      </Link>

      {/* Patient Header */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-card-foreground tracking-tight">{chart.patient.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              MRN: {chart.patient.mrn} &middot; DOB: {chart.patient.dob}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium text-secondary-foreground">
            {chart.insurance.payer} &middot; {chart.insurance.plan_name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
            <p className="text-sm font-medium text-card-foreground">{chart.diagnosis.icd10} &mdash; {chart.diagnosis.description}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{chart.medication ? "Medication" : "Procedure"}</p>
            <p className="text-sm font-medium text-card-foreground">
              {chart.medication
                ? `${chart.medication.name} ${chart.medication.dose} - ${chart.medication.frequency}`
                : chart.procedure
                  ? `CPT ${chart.procedure.cpt} - ${chart.procedure.description}`
                  : "N/A"}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Provider</p>
            <p className="text-sm font-medium text-card-foreground">{chart.provider.name}</p>
            <p className="text-xs text-muted-foreground">{chart.provider.practice}</p>
          </div>
        </div>

        {/* Prior Therapies */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Prior Therapies ({chart.prior_therapies.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {chart.prior_therapies.map((therapy, i) => (
              <span key={i} className="inline-block px-2.5 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                {therapy}
              </span>
            ))}
          </div>
        </div>

        {/* Labs */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(chart.labs).map(([key, value]) => (
            <div key={key} className="bg-muted rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</p>
              <p className="text-xs font-medium text-card-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Eligibility */}
      {eligibility && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Eligibility</h2>
          <EligibilityResultCard result={eligibility} />
        </div>
      )}

      {/* PA Requests */}
      {paRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">PA Requests</h2>
          <div className="flex flex-col gap-3">
            {paRequests.map((req) => (
              <PARequestCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}

      {/* Agent Runs */}
      {agentRuns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Agent Activity</h2>
          <AgentActivityFeed runs={agentRuns} />
        </div>
      )}
    </div>
  );
}
