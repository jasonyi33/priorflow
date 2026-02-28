"""
Test shared Pydantic models — validates that all fixtures
conform to the shared data contracts.

Owned by Dev 1. Run: uv run pytest tests/test_models.py
"""

import json
from pathlib import Path
from datetime import datetime

from shared.models import (
    PatientChart,
    EligibilityResult,
    PARequest,
    PAStatusUpdate,
    AgentRun,
    AlertPayload,
    Portal,
    PAStatusEnum,
    AgentType,
)


def test_patient_chart_from_fixture(sample_chart):
    """Verify MRN-00421.json conforms to PatientChart schema."""
    chart = PatientChart(**sample_chart)
    assert chart.patient.mrn == "MRN-00421"
    assert chart.patient.name == "Jane Doe"
    assert chart.insurance.payer == "Aetna"
    assert chart.diagnosis.icd10 == "M06.9"
    assert chart.medication is not None
    assert chart.medication.name == "Humira"
    assert len(chart.prior_therapies) > 0
    assert len(chart.labs) > 0
    assert chart.provider.npi == "1234567890"


def test_all_chart_fixtures_valid():
    """Verify all chart fixtures conform to PatientChart schema."""
    charts_dir = Path("data/charts")
    for chart_file in charts_dir.glob("MRN-*.json"):
        with open(chart_file) as f:
            data = json.load(f)
        chart = PatientChart(**data)
        assert chart.patient.mrn == chart_file.stem


def test_eligibility_result_creation():
    """Verify EligibilityResult can be constructed."""
    result = EligibilityResult(
        mrn="MRN-00421",
        portal=Portal.STEDI,
        payer="Aetna",
        coverage_active=True,
        copay="$30",
        pa_required=True,
        pa_required_reason="Specialty medication",
        checked_at=datetime.utcnow(),
    )
    assert result.coverage_active is True
    assert result.pa_required is True


def test_pa_request_creation():
    """Verify PARequest can be constructed."""
    now = datetime.utcnow()
    request = PARequest(
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.SUBMITTED,
        fields_filled=["patient_name", "diagnosis", "medication"],
        gaps_detected=[],
        justification_summary="Patient meets criteria",
        created_at=now,
        updated_at=now,
    )
    assert request.status == PAStatusEnum.SUBMITTED
    assert len(request.fields_filled) == 3
    assert len(request.gaps_detected) == 0


def test_agent_run_creation():
    """Verify AgentRun can be constructed."""
    run = AgentRun(
        agent_type=AgentType.PA_FORM_FILLER,
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        started_at=datetime.utcnow(),
        steps_taken=0,
        max_steps=40,
    )
    assert run.success is None
    assert run.completed_at is None


def test_alert_payload_creation():
    """Verify AlertPayload can be constructed."""
    alert = AlertPayload(
        patient_name="Jane Doe",
        mrn="MRN-00421",
        event_type="approved",
        portal=Portal.COVERMYMEDS,
        details="PA approved for 12-month duration",
        timestamp=datetime.utcnow(),
    )
    assert alert.event_type == "approved"
