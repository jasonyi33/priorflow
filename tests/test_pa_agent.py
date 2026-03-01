"""Tests for PA Form Filler agent components.

Tests the justification generator, chart loader, and form mapper
without needing a live browser or CoverMyMeds credentials.
"""

import pytest
import json
import asyncio
from pathlib import Path
from tools.justification_gen import generate_justification
from tools.chart_loader import load_chart
from tools.form_mapper import PA_FORM_FIELDS, NEW_REQUEST_FIELDS, KNOWN_GAPS_MRN_00421


# ──────────────────────────────────────────────────────────────
# Justification tests
# ──────────────────────────────────────────────────────────────

def test_justification_generation():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "Humira" in narrative or "adalimumab" in narrative
    assert "M06.9" in narrative  # diagnosis code
    assert "Methotrexate" in narrative  # prior therapy
    assert "medically necessary" in narrative.lower()


def test_justification_includes_labs():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "ESR" in narrative
    assert "CRP" in narrative
    assert "TB_test" in narrative or "TB" in narrative


def test_justification_includes_provider():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "Sarah Smith" in narrative
    assert chart.provider.npi in narrative


def test_justification_includes_imaging():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "xray" in narrative.lower() or "x-ray" in narrative.lower() or "erosive" in narrative.lower()


def test_justification_includes_prior_therapies_detail():
    chart = load_chart("MRN-00421")
    narrative = generate_justification(chart)
    assert "Sulfasalazine" in narrative
    assert "Methotrexate" in narrative


# ──────────────────────────────────────────────────────────────
# Chart validation tests
# ──────────────────────────────────────────────────────────────

def test_chart_has_required_fields_for_pa():
    chart = load_chart("MRN-00421")
    assert chart.medication is not None
    assert chart.medication.name == "Humira"
    assert chart.insurance.bin  # BIN required for CoverMyMeds
    assert chart.insurance.pcn
    assert chart.insurance.rx_group
    assert chart.provider.npi


def test_chart_diagnosis():
    chart = load_chart("MRN-00421")
    assert chart.diagnosis.icd10 == "M06.9"
    assert "rheumatoid" in chart.diagnosis.description.lower()


def test_chart_prior_therapies():
    chart = load_chart("MRN-00421")
    assert len(chart.prior_therapies) >= 3
    therapy_text = " ".join(chart.prior_therapies).lower()
    assert "methotrexate" in therapy_text


# ──────────────────────────────────────────────────────────────
# Form mapper tests
# ──────────────────────────────────────────────────────────────

def test_form_mapper_new_request_fields():
    assert "medication.name" in NEW_REQUEST_FIELDS
    assert "patient.first_name" in NEW_REQUEST_FIELDS
    assert "patient.last_name" in NEW_REQUEST_FIELDS
    assert "patient.dob" in NEW_REQUEST_FIELDS
    assert "insurance.bin" in NEW_REQUEST_FIELDS
    assert "insurance.pcn" in NEW_REQUEST_FIELDS
    assert "insurance.rx_group" in NEW_REQUEST_FIELDS


def test_form_mapper_pa_fields_patient():
    assert "patient.first_name" in PA_FORM_FIELDS
    assert "patient.last_name" in PA_FORM_FIELDS
    assert "patient.dob" in PA_FORM_FIELDS
    assert "patient.gender" in PA_FORM_FIELDS
    assert "patient.address.street" in PA_FORM_FIELDS
    assert "patient.address.city" in PA_FORM_FIELDS
    assert "patient.address.state" in PA_FORM_FIELDS
    assert "patient.address.zip" in PA_FORM_FIELDS


def test_form_mapper_pa_fields_provider():
    assert "provider.npi" in PA_FORM_FIELDS
    assert "provider.first_name" in PA_FORM_FIELDS
    assert "provider.last_name" in PA_FORM_FIELDS
    assert "provider.phone" in PA_FORM_FIELDS


def test_form_mapper_pa_fields_drug():
    assert "medication.quantity" in PA_FORM_FIELDS
    assert "medication.dosage_form" in PA_FORM_FIELDS
    assert "medication.days_supply" in PA_FORM_FIELDS
    assert "diagnosis.icd10" in PA_FORM_FIELDS


def test_known_gaps_documented():
    assert len(KNOWN_GAPS_MRN_00421) > 0
    gap_text = " ".join(KNOWN_GAPS_MRN_00421)
    assert "patient.address" in gap_text or "patient.gender" in gap_text
    assert "provider.address" in gap_text


# ──────────────────────────────────────────────────────────────
# Phase 2: PARequest conformance tests
# ──────────────────────────────────────────────────────────────

def test_pa_request_model_creation():
    """Verify PARequest can be created with expected fields."""
    from datetime import datetime, timezone
    from shared.models import PARequest, PAStatusEnum, Portal

    now = datetime.now(timezone.utc)
    pa = PARequest(
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.SUBMITTED,
        fields_filled=["patient_first_name", "patient_last_name", "diagnosis_icd10"],
        gaps_detected=["GAP: patient_address — not in chart data"],
        justification_summary="Patient meets criteria for Humira...",
        created_at=now,
        updated_at=now,
    )
    assert pa.mrn == "MRN-00421"
    assert pa.portal == Portal.COVERMYMEDS
    assert pa.status == PAStatusEnum.SUBMITTED
    assert len(pa.fields_filled) == 3
    assert len(pa.gaps_detected) == 1


def test_pa_request_serialization():
    """Verify PARequest serializes to JSON correctly."""
    from datetime import datetime, timezone
    from shared.models import PARequest, PAStatusEnum, Portal

    now = datetime.now(timezone.utc)
    pa = PARequest(
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.SUBMITTED,
        fields_filled=["patient_first_name"],
        gaps_detected=[],
        justification_summary="Test justification",
        created_at=now,
        updated_at=now,
    )
    data = pa.model_dump()
    assert data["mrn"] == "MRN-00421"
    assert data["portal"] == "covermymeds"
    assert data["status"] == "submitted"
    assert isinstance(data["fields_filled"], list)
    assert isinstance(data["gaps_detected"], list)


def test_pa_request_with_gaps():
    """Verify PARequest properly stores gap information."""
    from datetime import datetime, timezone
    from shared.models import PARequest, PAStatusEnum, Portal

    now = datetime.now(timezone.utc)
    gaps = [
        "GAP: patient_address — not in chart data",
        "GAP: provider_address — not in chart data",
        "GAP: patient_phone — not in chart data",
    ]
    pa = PARequest(
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.PENDING,
        fields_filled=[],
        gaps_detected=gaps,
        created_at=now,
        updated_at=now,
    )
    assert len(pa.gaps_detected) == 3
    assert all(g.startswith("GAP:") for g in pa.gaps_detected)
    assert pa.status == PAStatusEnum.PENDING


def test_save_pa_request_creates_file(tmp_path, monkeypatch):
    """Verify save_pa_request writes conformant JSON to disk."""
    from datetime import datetime, timezone
    from shared.models import PARequest, PAStatusEnum, Portal
    import tools.db_client as db_client

    monkeypatch.setattr(db_client, "OUTPUT_DIR", tmp_path)

    now = datetime.now(timezone.utc)
    pa = PARequest(
        mrn="MRN-TEST",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.SUBMITTED,
        fields_filled=["patient_first_name", "diagnosis_icd10"],
        gaps_detected=["GAP: patient_address — not in chart"],
        justification_summary="Test justification narrative",
        created_at=now,
        updated_at=now,
    )
    asyncio.run(db_client.save_pa_request(pa))

    output_file = tmp_path / "pa_submission_MRN-TEST.json"
    assert output_file.exists()

    with open(output_file) as f:
        data = json.load(f)
    assert data["mrn"] == "MRN-TEST"
    assert data["status"] == "submitted"
    assert data["portal"] == "covermymeds"
    assert len(data["fields_filled"]) == 2
    assert data["justification_summary"] == "Test justification narrative"


# ──────────────────────────────────────────────────────────────
# Phase 3: Reliability + multi-MRN tests
# ──────────────────────────────────────────────────────────────

def test_phone_formatting():
    """Verify phone numbers are formatted to XXX-XXX-XXXX."""
    from agents.pa_form_filler import _format_phone

    assert _format_phone("555-0100") == "555-555-0100"
    assert _format_phone("5550100") == "555-555-0100"
    assert _format_phone("555-0401") == "555-555-0401"
    assert _format_phone("1234567890") == "123-456-7890"
    assert _format_phone("123-456-7890") == "123-456-7890"


def test_gender_inference():
    """Verify gender is correctly inferred from common first names."""
    from agents.pa_form_filler import _infer_gender

    assert _infer_gender("Jane") == "Female"
    assert _infer_gender("David") == "Male"
    assert _infer_gender("Lisa") == "Female"
    assert _infer_gender("Sarah") == "Female"
    assert _infer_gender("Michael") == "Male"


def test_mrn_00744_chart_loads():
    """Verify MRN-00744 (Stelara) chart loads for demo."""
    chart = load_chart("MRN-00744")
    assert chart.patient.first_name == "David"
    assert chart.patient.last_name == "Kim"
    assert chart.medication is not None
    assert chart.medication.name == "Stelara"
    assert chart.diagnosis.icd10 == "L40.50"


def test_mrn_00744_justification():
    """Verify justification works for MRN-00744 (Stelara)."""
    chart = load_chart("MRN-00744")
    narrative = generate_justification(chart)
    assert "Stelara" in narrative
    assert "L40.50" in narrative
    assert "Humira" in narrative  # prior therapy includes failed Humira


def test_pharmacy_flow_import():
    """Verify pharmacy-initiated flow function is importable."""
    from agents.pa_form_filler import fill_covermymeds_from_key
    import inspect
    sig = inspect.signature(fill_covermymeds_from_key)
    assert "access_key" in sig.parameters
    assert "patient_last" in sig.parameters
    assert "patient_dob" in sig.parameters
    assert "mrn" in sig.parameters


def test_all_chart_fixtures_load():
    """Verify all chart fixtures can be loaded and validated."""
    import os
    chart_dir = Path("data/charts")
    for f in chart_dir.glob("MRN-*.json"):
        mrn = f.stem
        chart = load_chart(mrn)
        assert chart.patient.name
        assert chart.diagnosis.icd10
        assert chart.provider.npi
