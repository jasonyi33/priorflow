import { patients } from "@/lib/data/fixtures";
import { PatientCard } from "@/components/patient-card";
import { ChartUploader } from "@/components/chart-uploader";

export default function PatientsPage() {
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View loaded patient charts and upload new ones for eligibility checks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {patients.map((chart) => (
          <PatientCard key={chart.patient.mrn} chart={chart} />
        ))}
      </div>

      <ChartUploader />
    </div>
  );
}
