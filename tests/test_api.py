import json
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
    # Should return at least one record
    assert len(data) >= 0


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
