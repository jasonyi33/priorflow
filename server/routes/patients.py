"""
Patient endpoints — load and retrieve mock EMR chart data.

STUB: Returns fixture data. Dev 1 replaces with Convex integration in Phase 1.
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from shared.models import PatientChart, APIResponse

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "charts"


def _load_chart(mrn: str) -> dict:
    chart_file = DATA_DIR / f"{mrn}.json"
    if not chart_file.exists():
        raise HTTPException(status_code=404, detail=f"Patient {mrn} not found")
    with open(chart_file) as f:
        return json.load(f)


@router.get("")
async def list_patients() -> list[dict]:
    """List all loaded patient charts."""
    patients = []
    for chart_file in sorted(DATA_DIR.glob("MRN-*.json")):
        with open(chart_file) as f:
            patients.append(json.load(f))
    return patients


@router.get("/{mrn}")
async def get_patient(mrn: str) -> dict:
    """Get a single patient chart by MRN."""
    return _load_chart(mrn)


@router.post("")
async def create_patient(chart: PatientChart) -> APIResponse:
    """Upload a new patient chart (saves to local file for now)."""
    chart_file = DATA_DIR / f"{chart.patient.mrn}.json"
    with open(chart_file, "w") as f:
        json.dump(chart.model_dump(), f, indent=2, default=str)
    return APIResponse(
        success=True,
        message=f"Patient {chart.patient.mrn} saved",
        data={"mrn": chart.patient.mrn},
    )
