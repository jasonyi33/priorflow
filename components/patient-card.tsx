import type { PatientChart } from "@/lib/data/types";
import Link from "next/link";

export function PatientCard({ chart }: { chart: PatientChart }) {
  const { patient, insurance, diagnosis, medication, procedure, provider } = chart;

  return (
    <Link
      href={`/patients/${patient.mrn}`}
      className="block bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
            {patient.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            MRN: {patient.mrn} &middot; DOB: {patient.dob}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
          {insurance.payer}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground min-w-[24px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-card-foreground">
            {diagnosis.icd10} &mdash; {diagnosis.description}
          </span>
        </div>

        {medication && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground min-w-[24px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="1" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <span className="text-card-foreground">
              {medication.name} {medication.dose} &mdash; {medication.frequency}
            </span>
          </div>
        )}

        {procedure && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground min-w-[24px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 5h10M2 9h10M5 2v10M9 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-card-foreground">
              CPT {procedure.cpt} &mdash; {procedure.description}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-muted-foreground min-w-[24px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2.5 13c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-muted-foreground">
            {provider.name} &middot; {provider.practice}
          </span>
        </div>
      </div>
    </Link>
  );
}
