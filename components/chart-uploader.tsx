"use client";

import { useState } from "react";
import type { PatientChart } from "@/lib/data/types";

const sampleChart = `{
  "patient": {
    "name": "John Smith",
    "first_name": "John",
    "last_name": "Smith",
    "dob": "1975-06-20",
    "mrn": "MRN-99001"
  },
  "insurance": {
    "payer": "Aetna",
    "member_id": "W999888777",
    "bin": "004336",
    "pcn": "ADV",
    "rx_group": "RX9999",
    "plan_name": "Aetna Choice POS II"
  },
  "diagnosis": {
    "icd10": "J45.40",
    "description": "Moderate persistent asthma"
  },
  "medication": {
    "name": "Dupixent",
    "dose": "300mg",
    "frequency": "Every 2 weeks"
  },
  "prior_therapies": ["Inhaled corticosteroids x12 months", "LABA combination x6 months"],
  "labs": { "IgE": "450 IU/mL - elevated", "Eosinophils": "600 cells/uL - elevated" },
  "imaging": {},
  "provider": {
    "name": "Dr. Emily Wang",
    "npi": "6789012345",
    "practice": "Metro Health Pulmonology",
    "phone": "555-0600",
    "fax": "555-0601"
  }
}`;

export function ChartUploader() {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleUpload() {
    setError(null);
    setSuccess(false);

    if (!json.trim()) {
      setError("Please paste a patient chart JSON.");
      return;
    }

    try {
      const parsed = JSON.parse(json) as PatientChart;
      if (!parsed.patient?.mrn || !parsed.patient?.name) {
        setError("Invalid chart format: missing patient.mrn or patient.name.");
        return;
      }
      if (!parsed.insurance?.payer) {
        setError("Invalid chart format: missing insurance.payer.");
        return;
      }
      if (!parsed.diagnosis?.icd10) {
        setError("Invalid chart format: missing diagnosis.icd10.");
        return;
      }
      setSuccess(true);
      setJson("");
    } catch {
      setError("Invalid JSON. Please check the format and try again.");
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-3">Upload Patient Chart</h3>
      <textarea
        value={json}
        onChange={(e) => {
          setJson(e.target.value);
          setError(null);
          setSuccess(false);
        }}
        placeholder="Paste patient chart JSON here..."
        className="w-full h-48 p-3 rounded-lg border border-input bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Chart uploaded successfully. Eligibility check started.
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleUpload}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Upload Chart
        </button>
        <button
          type="button"
          onClick={() => {
            setJson(sampleChart);
            setError(null);
            setSuccess(false);
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors"
        >
          Load Sample
        </button>
      </div>
    </div>
  );
}
