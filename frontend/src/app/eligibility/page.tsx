/**
 * Eligibility page — view eligibility check results.
 *
 * Dev 4: Build out in Phase 1-2:
 * - EligibilityResult cards showing coverage status, copay, PA requirements
 * - "Check Eligibility" button that triggers POST /api/eligibility/check
 * - Real-time updates via Convex subscription on eligibilityChecks table
 */

export default function EligibilityPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Eligibility Checks
      </h1>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">Eligibility Results</p>
        <p className="text-sm">
          Dev 4: Build EligibilityResult component here.
          Data source: GET /api/eligibility/:mrn or Convex useQuery.
        </p>
      </div>
    </div>
  );
}
