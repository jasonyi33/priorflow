"""
CoverMyMeds form field mapping reference.

Maps patient chart JSON fields to CoverMyMeds form field names/labels.
This is the reference document that Agent 2 uses to fill forms correctly.

Owned by Dev 3.

FORM DOCUMENTED: Caremark Electronic PA Form (2017 NCPDP)
Selected via: New Request → "Humira" → Jane Doe / BIN 004336 / PCN ADV / RxGroup RX1234
Portal URL: dashboard.covermymeds.com
Form is an ePA (electronic Prior Authorization) — Caremark responds automatically.
"""

# ---------------------------------------------------------------------------
# CoverMyMeds New Request flow — field mapping
# (These are the fields on the initial request creation screen, BEFORE the
#  PA form loads. They determine which form is presented.)
# Format: chart_path -> (form_field_label, field_type, required)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Caremark Electronic PA Form (2017 NCPDP) — field mapping
# Documented from manual walkthrough screenshots on 2026-02-28.
#
# Sections in order: Patient → Drug → Provider → Type of Review → Submit
# ---------------------------------------------------------------------------
PA_FORM_FIELDS = {
    # ── Patient section ──
    "patient.prefix":       ("Prefix", "text", False),
    "patient.first_name":   ("First", "text", True),   # marked *
    "patient.middle_name":  ("Middle", "text", False),
    "patient.last_name":    ("Last", "text", True),     # marked *
    "patient.suffix":       ("Suffix", "text", False),
    "patient.dob":          ("Date of Birth", "date", True),  # format MM/DD/YYYY, marked *
    "patient.gender":       ("Gender", "radio", True),  # Male / Female, marked *
    "insurance.member_id":  ("Member ID", "text", False),
    "patient.address.street":  ("Street", "text", True),   # marked *
    "patient.address.street2": ("Street 2", "text", False),
    "patient.address.city":    ("City", "text", True),     # marked *
    "patient.address.state":   ("State", "dropdown", True),  # marked *
    "patient.address.zip":     ("Zip", "text", True),      # marked *
    "patient.phone":           ("Phone", "text", False),   # format XXX-XXX-XXXX
    # NOTE: "Check Eligibility" button appears here — required before Send to Plan

    # ── Drug section ──
    # "Medication Name" is pre-filled and read-only (shows full drug string
    #  e.g. "Humira (1 Pen) 80MG/0.8ML auto-injector kit")
    "medication.quantity":     ("Quantity", "text", True),       # marked *, numeric
    "medication.dosage_form":  ("Confirm dosage form", "dropdown", True),  # marked *
    "medication.daw1":         ("Should this request be reviewed for a brand only product (DAW-1)?",
                                "radio", False),  # Yes / No
    "medication.days_supply":  ("Days Supply", "text", True),    # marked *, "Not to exceed a 30-day supply"
    "diagnosis.icd10":         ("Primary Diagnosis", "text", True),

    # ── Provider section ──
    "provider.npi":               ("NPI", "text", True),   # marked *
    "provider.first_name":        ("First", "text", True),  # marked *
    "provider.last_name":         ("Last", "text", True),   # marked *
    "provider.address.street":    ("Street", "text", True),  # marked *
    "provider.address.street2":   ("Address Line 2 (optional)", "text", False),
    "provider.address.city":      ("City", "text", True),    # marked *
    "provider.address.state":     ("State", "dropdown", True),  # marked *
    "provider.address.zip":       ("Zip", "text", True),     # marked *
    "provider.phone":             ("Phone", "text", True),   # marked *, format XXX-XXX-XXXX
    "provider.fax":               ("Fax", "text", False),    # format XXX-XXX-XXXX
    # "Add this provider to address book" checkbox (optional)

    # ── Type of Review section ──
    "urgent_review":  ("Are you requesting an URGENT review?", "radio", False),  # Yes / No
    # Definition: "When the physician believes that waiting for a decision
    # under the standard time frame could place the enrollee's life, health,
    # or ability to regain maximum function in serious jeopardy."
}

# Sidebar actions visible on form:
# - "Send To Plan" button (top and bottom of page)
# - "Send To Prescriber" button (pink)
# - "Save" button
# - "Archive" button
# - Other Actions: Print/Download, Renew, Delete

# ---------------------------------------------------------------------------
# Known data gaps: fields required by the Caremark ePA form that are
# MISSING from the MRN-00421 chart fixture.
# ---------------------------------------------------------------------------
KNOWN_GAPS_MRN_00421 = [
    "GAP: patient.gender — need from provider (required, radio: Male/Female)",
    "GAP: patient.address.street — need from provider (required)",
    "GAP: patient.address.city — need from provider (required)",
    "GAP: patient.address.state — need from provider (required)",
    "GAP: patient.address.zip — need from provider (required)",
    "GAP: patient.phone — need from provider (not required but recommended)",
    "GAP: provider.first_name — chart has 'Dr. Sarah Smith' as single name, must split",
    "GAP: provider.last_name — chart has 'Dr. Sarah Smith' as single name, must split",
    "GAP: provider.address.street — need from provider (required)",
    "GAP: provider.address.city — need from provider (required)",
    "GAP: provider.address.state — need from provider (required)",
    "GAP: provider.address.zip — need from provider (required)",
    "GAP: medication.quantity — need from provider (required, numeric)",
    "GAP: medication.dosage_form — need from provider (required, dropdown)",
    "GAP: medication.days_supply — need from provider (required, max 30)",
]

# ---------------------------------------------------------------------------
# Clinical questions — Caremark ePA form specifics
#
# NOTE: The Caremark Electronic PA Form (2017 NCPDP) does NOT have free-text
# clinical justification or prior therapy fields on the initial form.
# Caremark processes the ePA electronically and may return follow-up
# questions ("More Info Needed") after submission. The clinical questions
# below may appear as follow-up criteria from Caremark, not on the initial form.
# ---------------------------------------------------------------------------
CLINICAL_QUESTIONS = {
    "humira": [
        # These may come back as Caremark follow-up questions after ePA submission:
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

# ---------------------------------------------------------------------------
# Form workflow notes (from screenshots):
#
# 1. "Checking Eligibility is required to send to plan" — a "Check Eligibility"
#    button appears in the Patient section. The agent MUST click this before
#    the "Send To Plan" button becomes active.
#
# 2. Phone fields validate format XXX-XXX-XXXX — agent must use dashes.
#
# 3. The form header shows: patient name, Key (e.g. BBXDR8MG), Drug string,
#    Form name, and ePA badge.
#
# 4. "Prescriber Next Steps" section states: "Click the 'Send to Plan' button
#    to submit this information to Caremark. This electronic submission does
#    not require a signature. Caremark will respond automatically with your
#    next steps."
#
# 5. Submit button label is "Send To Plan" (appears both in sidebar and at
#    bottom of the form under "Review Details").
# ---------------------------------------------------------------------------
