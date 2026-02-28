"use client";

import { useState } from "react";

interface FormData {
  patientName: string;
  patientDob: string;
  memberId: string;
  payer: string;
  diagnosisCode: string;
  diagnosisDescription: string;
  procedureCpt: string;
  procedureDescription: string;
  justification: string;
}

const initialForm: FormData = {
  patientName: "",
  patientDob: "",
  memberId: "",
  payer: "",
  diagnosisCode: "",
  diagnosisDescription: "",
  procedureCpt: "",
  procedureDescription: "",
  justification: "",
};

const requiredFields: (keyof FormData)[] = [
  "patientName",
  "patientDob",
  "memberId",
  "payer",
  "diagnosisCode",
  "procedureCpt",
  "justification",
];

export default function MockPortalPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [result, setResult] = useState<"approved" | "denied" | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const missing = requiredFields.filter((f) => !form[f].trim());
    setMissingFields(missing);

    if (missing.length > 0) {
      setResult("denied");
      return;
    }

    setResult("approved");
  }

  function handleReset() {
    setForm(initialForm);
    setResult(null);
    setMissingFields([]);
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResult(null);
    setMissingFields([]);
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="#d97706" strokeWidth="1.5" />
              <path d="M2 6h12" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="4.5" cy="4" r="0.75" fill="#d97706" />
              <circle cx="6.5" cy="4" r="0.75" fill="#d97706" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Mock Payer Portal</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Fallback PA form for scenarios not covered by CoverMyMeds (imaging, surgical PAs). Auto-approves when all required fields are present, denies otherwise.
        </p>
      </div>

      {result && (
        <div className={`rounded-xl border p-5 mb-6 ${result === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-3 mb-2">
            {result === "approved" ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3.5 3.5L15 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div>
              <h2 className={`text-lg font-semibold ${result === "approved" ? "text-emerald-800" : "text-red-800"}`}>
                {result === "approved" ? "PA Approved" : "PA Denied"}
              </h2>
              <p className={`text-sm ${result === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                {result === "approved"
                  ? "All required documentation present. PA approved for 12-month duration."
                  : `Missing required fields: ${missingFields.map((f) => f.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium underline mt-2 cursor-pointer"
            style={{ color: result === "approved" ? "#16a34a" : "#dc2626" }}
          >
            Submit another request
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border">
        {/* Patient Information */}
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Patient Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Patient Name" required value={form.patientName} onChange={(v) => updateField("patientName", v)} placeholder="Jane Doe" error={missingFields.includes("patientName")} />
            <FormField label="Date of Birth" required value={form.patientDob} onChange={(v) => updateField("patientDob", v)} placeholder="1985-03-15" error={missingFields.includes("patientDob")} />
            <FormField label="Member ID" required value={form.memberId} onChange={(v) => updateField("memberId", v)} placeholder="W123456789" error={missingFields.includes("memberId")} />
            <FormField label="Payer" required value={form.payer} onChange={(v) => updateField("payer", v)} placeholder="Aetna" error={missingFields.includes("payer")} />
          </div>
        </div>

        {/* Diagnosis & Procedure */}
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Diagnosis & Procedure</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="ICD-10 Code" required value={form.diagnosisCode} onChange={(v) => updateField("diagnosisCode", v)} placeholder="M54.5" error={missingFields.includes("diagnosisCode")} />
            <FormField label="Diagnosis Description" value={form.diagnosisDescription} onChange={(v) => updateField("diagnosisDescription", v)} placeholder="Low back pain" />
            <FormField label="CPT Code" required value={form.procedureCpt} onChange={(v) => updateField("procedureCpt", v)} placeholder="72148" error={missingFields.includes("procedureCpt")} />
            <FormField label="Procedure Description" value={form.procedureDescription} onChange={(v) => updateField("procedureDescription", v)} placeholder="MRI lumbar spine w/o contrast" />
          </div>
        </div>

        {/* Clinical Justification */}
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Clinical Justification</h3>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Medical Necessity Narrative <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.justification}
              onChange={(e) => updateField("justification", e.target.value)}
              placeholder="Describe the medical necessity for this procedure..."
              className={`w-full h-28 p-3 rounded-lg border text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none ${missingFields.includes("justification") ? "border-red-300 bg-red-50" : "border-input"}`}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="p-5 flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Submit PA Request
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  required,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring ${error ? "border-red-300 bg-red-50" : "border-input"}`}
      />
    </div>
  );
}
