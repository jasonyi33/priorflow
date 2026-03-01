import pytest

import server.routes.intake as intake


@pytest.mark.asyncio
async def test_persist_patient_to_convex_omits_null_optionals(monkeypatch):
    monkeypatch.setattr(intake.convex_client, "base_url", "https://convex.example")
    monkeypatch.setattr(intake.convex_client, "deploy_key", "dev:test")

    captured = {}

    async def fake_mutation(function_name: str, args: dict):
        captured["function_name"] = function_name
        captured["args"] = args
        return "doc_1"

    monkeypatch.setattr(intake.convex_client, "mutation", fake_mutation)

    chart = {
        "patient": {
            "name": "Jane Doe",
            "first_name": "Jane",
            "last_name": "Doe",
            "dob": "1989-02-03",
            "mrn": "MRN-00421",
        },
        "insurance": {
            "payer": "Aetna",
            "member_id": "A12345",
            "bin": "610502",
            "pcn": "ADV",
            "rx_group": "RX100",
            "plan_name": None,
        },
        "diagnosis": {"icd10": "M06.9", "description": "RA"},
        "medication": {"name": "Humira", "ndc": None, "dose": "40 mg", "frequency": "q2w"},
        "procedure": None,
        "prior_therapies": [],
        "labs": {},
        "imaging": {},
        "provider": {
            "name": "Dr. Smith",
            "npi": "1234567890",
            "practice": "Clinic",
            "phone": "555-555-0100",
            "fax": "555-555-0200",
        },
    }

    await intake._persist_patient_to_convex(chart)

    args = captured["args"]
    assert captured["function_name"] == "patients:upsertByMrn"
    assert "planName" not in args["insurance"]
    assert "ndc" not in args["medication"]


@pytest.mark.asyncio
async def test_persist_patient_to_convex_falls_back_to_create_when_upsert_missing(monkeypatch):
    monkeypatch.setattr(intake.convex_client, "base_url", "https://convex.example")
    monkeypatch.setattr(intake.convex_client, "deploy_key", "dev:test")

    calls: list[str] = []

    async def fake_mutation(function_name: str, args: dict):
        calls.append(function_name)
        if function_name == "patients:upsertByMrn":
            raise RuntimeError("Function not found")
        return "doc_1"

    monkeypatch.setattr(intake.convex_client, "mutation", fake_mutation)

    chart = {
        "patient": {
            "name": "Jane Doe",
            "first_name": "Jane",
            "last_name": "Doe",
            "dob": "1989-02-03",
            "mrn": "MRN-00421",
        },
        "insurance": {
            "payer": "Aetna",
            "member_id": "A12345",
            "bin": "610502",
            "pcn": "ADV",
            "rx_group": "RX100",
            "plan_name": None,
        },
        "diagnosis": {"icd10": "M06.9", "description": "RA"},
        "medication": {"name": "Humira", "ndc": None, "dose": "40 mg", "frequency": "q2w"},
        "procedure": None,
        "prior_therapies": [],
        "labs": {},
        "imaging": {},
        "provider": {
            "name": "Dr. Smith",
            "npi": "1234567890",
            "practice": "Clinic",
            "phone": "555-555-0100",
            "fax": "555-555-0200",
        },
    }

    await intake._persist_patient_to_convex(chart)

    assert calls == ["patients:upsertByMrn", "patients:create"]
