from datetime import UTC, datetime

import pytest

import tools.db_client as db_client
from shared.models import EligibilityResult, PARequest, PAStatusEnum, Portal


@pytest.mark.asyncio
async def test_save_eligibility_result_omits_none_optionals(monkeypatch):
    monkeypatch.setattr(db_client.convex_client, "base_url", "https://convex.example")
    monkeypatch.setattr(db_client.convex_client, "deploy_key", "dev:test")

    captured: dict[str, object] = {}

    async def fake_mutation(function_name: str, args: dict):
        captured["function_name"] = function_name
        captured["args"] = args
        return "doc_1"

    async def fake_ensure_pa_request_entry(**_kwargs):
        return True

    monkeypatch.setattr(db_client.convex_client, "mutation", fake_mutation)
    monkeypatch.setattr(db_client, "ensure_pa_request_entry", fake_ensure_pa_request_entry)

    result = EligibilityResult(
        mrn="MRN-00421",
        portal=Portal.STEDI,
        payer="Aetna",
        coverage_active=True,
        copay=None,
        deductible=None,
        out_of_pocket_max=None,
        pa_required=True,
        pa_required_reason=None,
        raw_response=None,
        checked_at=datetime.now(UTC),
    )

    await db_client.save_eligibility_result(result)

    assert captured["function_name"] == "eligibilityChecks:create"
    args = captured["args"]
    assert isinstance(args, dict)
    assert "copay" not in args
    assert "deductible" not in args
    assert "outOfPocketMax" not in args
    assert "paRequiredReason" not in args
    assert "rawResponse" not in args


@pytest.mark.asyncio
async def test_save_pa_request_omits_none_optionals(monkeypatch):
    monkeypatch.setattr(db_client.convex_client, "base_url", "https://convex.example")
    monkeypatch.setattr(db_client.convex_client, "deploy_key", "dev:test")

    captured: dict[str, object] = {}

    async def fake_mutation(function_name: str, args: dict):
        captured["function_name"] = function_name
        captured["args"] = args
        return "doc_1"

    monkeypatch.setattr(db_client.convex_client, "mutation", fake_mutation)

    now = datetime.now(UTC)
    request = PARequest(
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.SUBMITTED,
        fields_filled=["patient_name"],
        gaps_detected=[],
        justification_summary=None,
        submission_id=None,
        gif_path=None,
        created_at=now,
        updated_at=now,
    )

    await db_client.save_pa_request(request)

    assert captured["function_name"] == "paRequests:upsertByMrnPortal"
    args = captured["args"]
    assert isinstance(args, dict)
    assert "justificationSummary" not in args
    assert "submissionId" not in args
    assert "gifPath" not in args


@pytest.mark.asyncio
async def test_save_pa_request_falls_back_to_create_when_upsert_missing(monkeypatch):
    monkeypatch.setattr(db_client.convex_client, "base_url", "https://convex.example")
    monkeypatch.setattr(db_client.convex_client, "deploy_key", "dev:test")

    calls: list[str] = []

    async def fake_mutation(function_name: str, args: dict):
        calls.append(function_name)
        if function_name == "paRequests:upsertByMrnPortal":
            raise RuntimeError("Function not found")
        return "doc_1"

    monkeypatch.setattr(db_client.convex_client, "mutation", fake_mutation)

    now = datetime.now(UTC)
    request = PARequest(
        mrn="MRN-00421",
        portal=Portal.COVERMYMEDS,
        medication_or_procedure="Humira 40mg",
        status=PAStatusEnum.SUBMITTED,
        fields_filled=["patient_name"],
        gaps_detected=[],
        created_at=now,
        updated_at=now,
    )

    await db_client.save_pa_request(request)

    assert calls == ["paRequests:upsertByMrnPortal", "paRequests:create"]
