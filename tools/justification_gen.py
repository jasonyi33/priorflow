"""
Clinical justification narrative generator.

Builds medical necessity narratives from structured chart data
for PA form submissions.

Owned by Dev 3.
"""

from shared.models import PatientChart


def generate_justification(chart: PatientChart) -> str:
    """Generate a clinical justification narrative from patient chart data.

    TODO: Dev 3 — Enhance in Phase 2:
    - Consider using Claude API for richer medical writing
    - Add medication-specific criteria references
    - Include payer-specific guideline citations
    """
    # Determine what we're requesting PA for
    if chart.medication:
        therapy = f"{chart.medication.name} {chart.medication.dose} {chart.medication.frequency}"
    elif chart.procedure:
        therapy = f"{chart.procedure.description} (CPT {chart.procedure.cpt})"
    else:
        therapy = "the requested therapy"

    # Build prior therapy summary
    prior_summary = "; ".join(chart.prior_therapies) if chart.prior_therapies else "None documented"

    # Build lab summary
    lab_summary = ", ".join(
        f"{k}: {v}" for k, v in chart.labs.items()
    ) if chart.labs else "None available"

    # Build imaging summary
    imaging_summary = ", ".join(
        f"{k}: {v}" for k, v in chart.imaging.items()
    ) if chart.imaging else "None available"

    narrative = f"""Clinical Justification for Prior Authorization

Patient: {chart.patient.name}, DOB: {chart.patient.dob}
Diagnosis: {chart.diagnosis.icd10} — {chart.diagnosis.description}
Requested Therapy: {therapy}

MEDICAL NECESSITY:

The patient presents with {chart.diagnosis.description} ({chart.diagnosis.icd10}). \
The following conservative therapies have been attempted and have failed to provide \
adequate clinical response or were discontinued due to adverse effects:

{prior_summary}

SUPPORTING CLINICAL EVIDENCE:

Laboratory findings: {lab_summary}

Imaging findings: {imaging_summary}

CONCLUSION:

Based on the patient's documented treatment history, objective clinical findings, \
and current clinical guidelines, {therapy} is medically necessary as the next \
appropriate step in the treatment algorithm. The patient meets all payer criteria \
for this therapy, having demonstrated inadequate response to or intolerance of \
conventional treatment options.

Prescribing Provider: {chart.provider.name}, NPI: {chart.provider.npi}
Practice: {chart.provider.practice}
Contact: {chart.provider.phone} / Fax: {chart.provider.fax}"""

    return narrative
