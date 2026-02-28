"""
CoverMyMeds form field mapping reference.

Maps patient chart JSON fields to CoverMyMeds form field names/labels.
This is the reference document that Agent 2 uses to fill forms correctly.

Owned by Dev 3.

IMPORTANT: Dev 3 must manually walk through CoverMyMeds during Phase 0
and document actual field names/labels here. The initial mapping below
is based on common PA form fields — update with actual portal field names.
"""

# CoverMyMeds New Request flow — field mapping
# Format: chart_path -> (form_field_label, field_type, required)
NEW_REQUEST_FIELDS = {
    # Step 1: Medication search
    "medication.name": ("Medication", "text_search", True),

    # Step 2: Patient demographics + plan info
    "patient.first_name": ("Patient First Name", "text", True),
    "patient.last_name": ("Patient Last Name", "text", True),
    "patient.dob": ("Date of Birth", "date", True),
    "insurance.bin": ("BIN", "text", True),
    "insurance.pcn": ("PCN", "text", True),
    "insurance.rx_group": ("Group", "text", True),
    "insurance.member_id": ("Member ID", "text", False),
}

# PA form fields (after form selection)
# These vary by medication and payer — Dev 3 should document variations
PA_FORM_FIELDS = {
    # Patient info
    "patient.first_name": ("Patient First Name", "text", True),
    "patient.last_name": ("Patient Last Name", "text", True),
    "patient.dob": ("Patient Date of Birth", "date", True),

    # Provider info
    "provider.name": ("Prescriber Name", "text", True),
    "provider.npi": ("NPI", "text", True),
    "provider.practice": ("Practice Name", "text", True),
    "provider.phone": ("Office Phone", "text", True),
    "provider.fax": ("Office Fax", "text", True),

    # Diagnosis
    "diagnosis.icd10": ("ICD-10 Code", "text", True),
    "diagnosis.description": ("Diagnosis Description", "text", True),

    # Medication (if medication PA)
    "medication.name": ("Drug Name", "text", True),
    "medication.dose": ("Dose/Strength", "text", True),
    "medication.frequency": ("Frequency", "text", True),
    "medication.ndc": ("NDC", "text", False),

    # Procedure (if procedure PA)
    "procedure.cpt": ("CPT Code", "text", False),
    "procedure.description": ("Procedure Description", "text", False),

    # Clinical — these are typically free-text or yes/no
    "prior_therapies": ("Prior Therapies Tried", "textarea", True),
    "clinical_justification": ("Clinical Justification", "textarea", True),
    "labs": ("Lab Results", "textarea", False),
    "imaging": ("Imaging Results", "textarea", False),
}

# Common clinical questions on PA forms (medication-specific)
# Dev 3: Add more as you discover them on the actual forms
CLINICAL_QUESTIONS = {
    "humira": [
        "Has the patient tried and failed methotrexate?",
        "Has the patient tried and failed another conventional DMARD?",
        "What is the patient's current disease activity score?",
        "Is the patient's TB test negative?",
        "Is the patient's Hepatitis B test negative?",
    ],
    "stelara": [
        "Has the patient tried and failed a TNF inhibitor?",
        "How many TNF inhibitors has the patient tried?",
        "What was the reason for discontinuation of prior biologic?",
        "Is the patient's TB test negative?",
    ],
    "ocrevus": [
        "How many relapses has the patient had in the past 12 months?",
        "Has the patient tried and failed a first-line DMT?",
        "What is the patient's current EDSS score?",
        "Is the patient's Hepatitis B screening negative?",
        "Is the patient's JC virus antibody status known?",
    ],
}
