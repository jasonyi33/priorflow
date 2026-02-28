import { eligibilityResults, patients } from "@/lib/data/fixtures";
import { EligibilityResultCard } from "@/components/eligibility-result-card";

export default function EligibilityPage() {
  const paRequired = eligibilityResults.filter((r) => r.pa_required).length;
  const activeCount = eligibilityResults.filter((r) => r.coverage_active).length;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Eligibility Checks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Insurance coverage verification and prior authorization requirements.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Checks</p>
          <p className="text-2xl font-semibold text-card-foreground">{eligibilityResults.length}</p>
          <p className="text-xs text-muted-foreground mt-1">across {patients.length} patients</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">Coverage Active</p>
          <p className="text-2xl font-semibold text-emerald-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">of {eligibilityResults.length} checked</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-1">PA Required</p>
          <p className="text-2xl font-semibold text-amber-600">{paRequired}</p>
          <p className="text-xs text-muted-foreground mt-1">need prior authorization</p>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-4">
        {eligibilityResults.map((result) => (
          <EligibilityResultCard key={`${result.mrn}-${result.portal}`} result={result} />
        ))}
      </div>
    </div>
  );
}
