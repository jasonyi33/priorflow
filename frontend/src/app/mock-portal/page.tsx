/**
 * Mock Portal — fallback payer portal for medical/surgical PA scenarios
 * not covered by CoverMyMeds (e.g., imaging PA, surgical PA).
 *
 * Dev 4: Build out in Phase 2-3:
 * - Simple PA form with standard fields
 * - Accept/deny logic based on whether required documentation is present
 * - This is only used if CoverMyMeds blocks automation or for surgical PAs
 */

export default function MockPortalPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Mock Payer Portal
      </h1>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">
          Fallback PA Portal
        </p>
        <p className="text-sm">
          Dev 4: Build mock PA form here for imaging/surgical PA scenarios.
          Only needed if CoverMyMeds blocks automation.
        </p>
      </div>
    </div>
  );
}
