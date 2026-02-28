/**
 * Patients page — view loaded patient charts and upload new ones.
 *
 * Dev 4: Build out in Phase 1-2:
 * - PatientList component with cards for each patient
 * - ChartUploader component (paste/upload JSON)
 * - PatientCard showing demographics, insurance, diagnosis
 * - Click-through to patient detail with eligibility + PA status
 */

export default function PatientsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Patients</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">Patient List</p>
        <p className="text-sm">
          Dev 4: Build PatientList + ChartUploader components here.
          Data source: GET /api/patients or Convex useQuery.
        </p>
      </div>
    </div>
  );
}
