"""
Patient endpoints — Convex-first with local file fallback.

If Convex is configured (CONVEX_URL + CONVEX_DEPLOY_KEY), we read/write
patients via Convex HTTP API. Otherwise we fall back to local chart files
under data/charts for the demo fixtures.
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from shared.models import PatientChart, APIResponse
from server.services.convex_client import convex_client

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "charts"


def _load_chart_file(mrn: str) -> dict:
    chart_file = DATA_DIR / f"{mrn}.json"
    if not chart_file.exists():
        raise HTTPException(status_code=404, detail=f"Patient {mrn} not found")
    with open(chart_file) as f:
        return json.load(f)


def _chart_to_convex_args(chart: PatientChart) -> dict:
    args = {
        "mrn": chart.patient.mrn,
        "firstName": chart.patient.first_name,
        "lastName": chart.patient.last_name,
        "dob": chart.patient.dob,
        "insurance": {
            "payer": chart.insurance.payer,
            "memberId": chart.insurance.member_id,
            "bin": chart.insurance.bin,
            "pcn": chart.insurance.pcn,
            "rxGroup": chart.insurance.rx_group,
            "planName": chart.insurance.plan_name,
        },
        "diagnosis": {
            "icd10": chart.diagnosis.icd10,
            "description": chart.diagnosis.description,
        },
        "medication": (
            {
                "name": chart.medication.name,
                "ndc": chart.medication.ndc,
                "dose": chart.medication.dose,
                "frequency": chart.medication.frequency,
            }
            if chart.medication
            else None
        ),
        "procedure": (
            {
                "cpt": chart.procedure.cpt,
                "description": chart.procedure.description,
            }
            if chart.procedure
            else None
        ),
        "priorTherapies": chart.prior_therapies,
        "labs": chart.labs,
        "imaging": chart.imaging,
        "provider": {
            "name": chart.provider.name,
            "npi": chart.provider.npi,
            "practice": chart.provider.practice,
            "phone": chart.provider.phone,
            "fax": chart.provider.fax,
        },
        "chartJson": chart.model_dump_json(),
    }
    if args.get("medication") is None:
        args.pop("medication")
    if args.get("procedure") is None:
        args.pop("procedure")
    return args


@router.get("")
async def list_patients() -> list[dict]:
    """List all patients from Convex, falling back to fixture files."""
    if convex_client.enabled:
        try:
            return await convex_client.query("patients:list")
        except Exception:
            pass

    patients: list[dict] = []
    for chart_file in sorted(DATA_DIR.glob("MRN-*.json")):
        with open(chart_file) as f:
            patients.append(json.load(f))
    return patients


@router.get("/{mrn}")
async def get_patient(mrn: str) -> dict:
    """Get a single patient chart by MRN."""
    if convex_client.enabled:
        try:
            patient = await convex_client.query("patients:getByMrn", {"mrn": mrn})
            if patient:
                return patient
        except Exception:
            pass
    return _load_chart_file(mrn)


@router.post("")
async def create_patient(chart: PatientChart) -> APIResponse:
    """Upload a new patient chart. Writes to Convex if configured, always saves file."""
    chart_file = DATA_DIR / f"{chart.patient.mrn}.json"
    with open(chart_file, "w") as f:
        json.dump(chart.model_dump(), f, indent=2, default=str)

    if convex_client.enabled:
        try:
            await convex_client.mutation("patients:create", _chart_to_convex_args(chart))
        except Exception:
            pass

    return APIResponse(
        success=True,
        message=f"Patient {chart.patient.mrn} saved",
        data={"mrn": chart.patient.mrn},
    )
