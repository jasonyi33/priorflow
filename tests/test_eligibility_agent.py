"""
Tests for Agent 1 (Eligibility Checker) — validates chart loading,
eligibility result schema, parsers, alert builders, and persistence.

Owned by Dev 2. Run: uv run pytest tests/test_eligibility_agent.py -v
"""

import json
from pathlib import Path
from datetime import datetime, UTC

import pytest

from shared.models import EligibilityResult, Portal, AlertPayload
from tools.chart_loader import load_chart, list_available_charts
from tools.eligibility_parser import parse_stedi_response, parse_claimmd_response
from tools.alert_sender import (
    build_approval_alert,
    build_denial_alert,
    build_delay_alert,
)


DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = Path(__file__).parent.parent / "output"


def test_chart_loads_for_all_fixtures():
    """All 5 MRN chart files load successfully via chart_loader."""
    mrns = list_available_charts()
    assert len(mrns) == 5
    for mrn in mrns:
        chart = load_chart(mrn)
        assert chart.patient.mrn == mrn


def test_chart_has_insurance_for_eligibility():
    """Each chart has the insurance fields needed for eligibility checks."""
    for mrn in list_available_charts():
        chart = load_chart(mrn)
        assert chart.insurance.payer
        assert chart.insurance.member_id
        assert chart.insurance.bin
        assert chart.insurance.pcn


def test_eligibility_result_schema():
    """EligibilityResult can be constructed with all fields and serialized."""
    result = EligibilityResult(
        mrn="MRN-00421",
        portal=Portal.STEDI,
        payer="Aetna",
        coverage_active=True,
        copay="$30 specialist",
        deductible="$1,500 individual",
        out_of_pocket_max="$6,000",
        pa_required=True,
        pa_required_reason="Specialty medication requires PA",
        raw_response="test raw response",
        checked_at=datetime.now(UTC),
    )
    assert result.mrn == "MRN-00421"
    assert result.portal == Portal.STEDI
    assert result.coverage_active is True
    assert result.pa_required is True
    dumped = result.model_dump()
    assert "mrn" in dumped
    assert "checked_at" in dumped


def test_eligibility_result_from_sample_fixture():
    """The sample eligibility fixture validates as EligibilityResult."""
    with open(DATA_DIR / "fixtures" / "eligibility_sample.json") as f:
        data = json.load(f)
    result = EligibilityResult(**data)
    assert result.mrn == "MRN-00421"
    assert result.portal == Portal.STEDI
    assert result.pa_required is True


def test_parse_stedi_response():
    """parse_stedi_response returns EligibilityResult with Portal.STEDI."""
    result = parse_stedi_response("MRN-00421", "Coverage active. Copay $30.")
    assert isinstance(result, EligibilityResult)
    assert result.portal == Portal.STEDI
    assert result.mrn == "MRN-00421"
    assert result.raw_response == "Coverage active. Copay $30."


def test_parse_claimmd_response():
    """parse_claimmd_response returns EligibilityResult with Portal.CLAIMMD."""
    result = parse_claimmd_response("MRN-00421", "Eligibility confirmed.")
    assert isinstance(result, EligibilityResult)
    assert result.portal == Portal.CLAIMMD
    assert result.mrn == "MRN-00421"


def test_alert_builders():
    """Alert builder functions return valid AlertPayload objects."""
    approval = build_approval_alert("Jane Doe", "MRN-00421", Portal.COVERMYMEDS, "12 months")
    assert isinstance(approval, AlertPayload)
    assert approval.event_type == "approved"
    assert "12 months" in approval.details

    denial = build_denial_alert("Jane Doe", "MRN-00421", Portal.COVERMYMEDS, "Step therapy not met")
    assert denial.event_type == "denied"
    assert "Step therapy" in denial.details

    delay = build_delay_alert("Jane Doe", "MRN-00421", Portal.COVERMYMEDS, 5)
    assert delay.event_type == "delayed"
    assert "5 days" in delay.details


@pytest.mark.asyncio
async def test_save_eligibility_result(tmp_path, monkeypatch):
    """save_eligibility_result writes valid JSON to output directory."""
    from tools import db_client

    monkeypatch.setattr(db_client, "OUTPUT_DIR", tmp_path)

    result = EligibilityResult(
        mrn="MRN-00421",
        portal=Portal.STEDI,
        payer="Aetna",
        coverage_active=True,
        pa_required=True,
        pa_required_reason="Specialty medication",
        checked_at=datetime.now(UTC),
    )
    success = await db_client.save_eligibility_result(result)
    assert success is True

    output_file = tmp_path / "eligibility_MRN-00421.json"
    assert output_file.exists()
    with open(output_file) as f:
        saved = json.load(f)
    assert saved["mrn"] == "MRN-00421"
    assert saved["pa_required"] is True
