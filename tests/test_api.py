from pathlib import Path
from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"


def test_list_patients():
    resp = client.get("/api/patients")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(item.get("patient", {}).get("mrn") == "MRN-00421" or item.get("mrn") == "MRN-00421" for item in data)


def test_get_patient_fixture():
    resp = client.get("/api/patients/MRN-00421")
    assert resp.status_code == 200
    data = resp.json()
    # Should contain MRN either at root or under patient
    assert data.get("mrn") == "MRN-00421" or data.get("patient", {}).get("mrn") == "MRN-00421"


def test_get_eligibility_fixture():
    resp = client.get("/api/eligibility/MRN-00421")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_pa_list_fixture():
    resp = client.get("/api/pa")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_agents_runs_fixture():
    resp = client.get("/api/agents/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_run_polling_endpoint_not_found():
    resp = client.get("/api/agents/runs/does-not-exist")
    assert resp.status_code == 404


def test_intake_pdf_creates_patient_and_starts_flow(monkeypatch, tmp_path):
    import server.routes.intake as intake

    monkeypatch.setattr(intake, "CHARTS_DIR", tmp_path / "charts")
    monkeypatch.setattr(intake, "UPLOADS_DIR", tmp_path / "uploads")

    def fake_extract(_pdf_path):
        return {
            "patient": {"first_name": "Alex", "last_name": "Rivera", "dob": "1990-02-03", "gender": "Female"},
            "insurance": {"payer": "Aetna", "member_id": "M-123", "bin": "123456", "pcn": "ADV", "rx_group": "RX1"},
            "diagnosis": {"icd10": "M06.9", "description": "Rheumatoid arthritis"},
            "medication": {"name": "Humira", "dose": "40mg", "frequency": "q2w", "quantity": "1", "days_supply": "30", "dosage_form": "Kit"},
            "provider": {"name": "Dr. Smith", "npi": "1234567890", "phone": "5551112222", "fax": "5551113333"},
            "clinical_support": {"prior_therapies": [], "labs": {}, "imaging": {}},
            "confidence": {},
            "missing_fields": [],
            "source": {"minimax_file_id": "file_1", "extracted_at": "2026-01-01T00:00:00Z"},
        }

    started: dict[str, str] = {}

    async def fake_dispatch(mrn: str):
        started["mrn"] = mrn
        return {"eligibility_run_id": "x", "pa_run_id": "y", "status_run_id": "z", "pa_required": True}

    monkeypatch.setattr(intake, "extract_pdf_to_pa_fields", fake_extract)
    monkeypatch.setattr(intake, "save_extraction", lambda mrn, payload: Path(tmp_path / f"{mrn}.json"))
    monkeypatch.setattr(intake.orchestrator, "dispatch_full_flow", fake_dispatch)

    resp = client.post(
        "/api/intake/pdf",
        files={"file": ("chart.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["success"] is True
    assert payload["data"]["flow_started"] is True
    assert payload["data"]["mrn"].startswith("MRN-")
    assert started["mrn"] == payload["data"]["mrn"]


def test_intake_pdf_rejects_non_pdf():
    resp = client.post(
        "/api/intake/pdf",
        files={"file": ("chart.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400
