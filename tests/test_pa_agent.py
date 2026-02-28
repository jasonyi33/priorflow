"""Tests for PA Form Filler agent components.

Tests the justification generator, chart loader, and form mapper
without needing a live browser or CoverMyMeds credentials.
"""

import pytest
from tools.justification_gen import generate_justification
from tools.chart_loader import load_chart
from tools.form_mapper import PA_FORM_FIELDS, NEW_REQUEST_FIELDS, KNOWN_GAPS_MRN_00421


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
