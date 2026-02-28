import type { EligibilityResult } from "@/lib/data/types";

function PortalBadge({ portal }: { portal: string }) {
  const colors: Record<string, string> = {
    stedi: "bg-blue-50 text-blue-700",
    claimmd: "bg-indigo-50 text-indigo-700",
    covermymeds: "bg-teal-50 text-teal-700",
    mock: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[portal] || "bg-gray-100 text-gray-600"}`}>
      {portal === "claimmd" ? "Claim.MD" : portal === "covermymeds" ? "CoverMyMeds" : portal.charAt(0).toUpperCase() + portal.slice(1)}
    </span>
  );
}

export function EligibilityResultCard({ result }: { result: EligibilityResult }) {
  const checkedDate = new Date(result.checked_at);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-card-foreground">{result.payer}</h3>
            <PortalBadge portal={result.portal} />
          </div>
          <p className="text-sm text-muted-foreground">
            MRN: {result.mrn} &middot; Checked {checkedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {checkedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${result.coverage_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${result.coverage_active ? "bg-emerald-500" : "bg-red-500"}`} />
          {result.coverage_active ? "Active" : "Inactive"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {result.copay && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Copay</p>
            <p className="text-sm font-medium text-card-foreground">{result.copay}</p>
          </div>
        )}
        {result.deductible && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Deductible</p>
            <p className="text-sm font-medium text-card-foreground">{result.deductible}</p>
          </div>
        )}
        {result.out_of_pocket_max && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">OOP Max</p>
            <p className="text-sm font-medium text-card-foreground">{result.out_of_pocket_max}</p>
          </div>
        )}
      </div>

      <div className={`rounded-lg p-3 ${result.pa_required ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
        <div className="flex items-center gap-2 mb-1">
          {result.pa_required ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v3M8 10.5v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 14h12L8 2 2 14z" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="#16a34a" strokeWidth="1.5" />
              <path d="M5.5 8l2 2 3-3.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className={`text-sm font-semibold ${result.pa_required ? "text-amber-700" : "text-emerald-700"}`}>
            {result.pa_required ? "PA Required" : "No PA Required"}
          </span>
        </div>
        {result.pa_required_reason && (
          <p className={`text-xs leading-relaxed ${result.pa_required ? "text-amber-600" : "text-emerald-600"}`}>
            {result.pa_required_reason}
          </p>
        )}
      </div>
    </div>
  );
}
