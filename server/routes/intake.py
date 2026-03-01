"""PDF intake endpoint: upload -> MiniMax extraction -> patient create/update -> full flow."""

from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from server.services import orchestrator
from server.services.convex_client import convex_client
from shared.models import APIResponse, PatientChart
from tools.minimax_client import MiniMaxClientError
from tools.minimax_extractor import extract_pdf_to_pa_fields, save_extraction

logger = logging.getLogger(__name__)

router = APIRouter()

CHARTS_DIR = Path(__file__).parent.parent.parent / "data" / "charts"
UPLOADS_DIR = Path(__file__).parent.parent.parent / "data" / "uploads"


@router.post("/pdf")
async def intake_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> APIResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    temp_pdf = UPLOADS_DIR / f"intake-{int(datetime.now(UTC).timestamp())}.pdf"
    with temp_pdf.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        extracted = extract_pdf_to_pa_fields(temp_pdf)
    except MiniMaxClientError as exc:
        temp_pdf.unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail=f"MiniMax extraction failed: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        temp_pdf.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Failed to parse intake PDF: {exc}") from exc

    mrn = _find_existing_mrn(extracted) or _generate_mrn()
    existing = _load_chart_if_exists(mrn)
    patient_created = existing is None
    patient_updated = existing is not None

    if existing is None:
        chart = _build_new_chart(mrn, extracted)
    else:
        chart = _merge_chart(existing, extracted)

    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    chart_path = CHARTS_DIR / f"{mrn}.json"
    with chart_path.open("w") as f:
        json.dump(chart, f, indent=2, default=str)

    patient_dir = UPLOADS_DIR / mrn
    patient_dir.mkdir(parents=True, exist_ok=True)
    final_pdf_path = patient_dir / "latest.pdf"
    shutil.move(str(temp_pdf), final_pdf_path)

    extraction_path = save_extraction(mrn, extracted)
    await _persist_patient_to_convex(chart, patient_created=patient_created)

    background_tasks.add_task(orchestrator.dispatch_full_flow, mrn)

    return APIResponse(
        success=True,
        message=f"Intake accepted for {mrn}; flow started",
        data={
            "mrn": mrn,
            "patient_created": patient_created,
            "patient_updated": patient_updated,
            "chart_pdf_path": str(final_pdf_path),
            "extraction_path": str(extraction_path),
            "extracted_fields": extracted,
            "missing_fields": extracted.get("missing_fields", []),
            "flow_started": True,
        },
    )


def _load_chart_if_exists(mrn: str) -> dict[str, Any] | None:
    path = CHARTS_DIR / f"{mrn}.json"
    if not path.exists():
        return None
    with path.open() as f:
        return json.load(f)


def _find_existing_mrn(extracted: dict[str, Any]) -> str | None:
    insurance = extracted.get("insurance", {})
    patient = extracted.get("patient", {})
    member_id = str(insurance.get("member_id", "")).strip().lower()
    first = str(patient.get("first_name", "")).strip().lower()
    last = str(patient.get("last_name", "")).strip().lower()
    dob = str(patient.get("dob", "")).strip()

    for chart_file in CHARTS_DIR.glob("MRN-*.json"):
        try:
            with chart_file.open() as f:
                chart = json.load(f)
        except Exception:
            continue
        current_member = str(chart.get("insurance", {}).get("member_id", "")).strip().lower()
        if member_id and current_member and current_member == member_id:
            return str(chart.get("patient", {}).get("mrn", chart_file.stem))

        current_patient = chart.get("patient", {})
        if (
            first
            and last
            and dob
            and str(current_patient.get("first_name", "")).strip().lower() == first
            and str(current_patient.get("last_name", "")).strip().lower() == last
            and str(current_patient.get("dob", "")).strip() == dob
        ):
            return str(current_patient.get("mrn", chart_file.stem))

    return None


def _generate_mrn() -> str:
    now = datetime.now(UTC)
    return f"MRN-AUTO-{now.strftime('%Y%m%d%H%M%S')}"


def _build_new_chart(mrn: str, extracted: dict[str, Any]) -> dict[str, Any]:
    p = extracted.get("patient", {})
    i = extracted.get("insurance", {})
    d = extracted.get("diagnosis", {})
    m = extracted.get("medication", {})
    provider = extracted.get("provider", {})
    support = extracted.get("clinical_support", {})

    first = str(p.get("first_name", "")).strip() or "Unknown"
    last = str(p.get("last_name", "")).strip() or "Patient"

    chart = {
        "patient": {
            "name": f"{first} {last}".strip(),
            "first_name": first,
            "last_name": last,
            "dob": str(p.get("dob", "")).strip() or "1970-01-01",
            "mrn": mrn,
        },
        "insurance": {
            "payer": str(i.get("payer", "")).strip() or "Unknown Payer",
            "member_id": str(i.get("member_id", "")).strip() or mrn,
            "bin": str(i.get("bin", "")).strip() or "000000",
            "pcn": str(i.get("pcn", "")).strip() or "UNKNOWN",
            "rx_group": str(i.get("rx_group", "")).strip() or "UNKNOWN",
            "plan_name": None,
        },
        "diagnosis": {
            "icd10": str(d.get("icd10", "")).strip() or "R69",
            "description": str(d.get("description", "")).strip() or "Condition not specified",
        },
        "medication": {
            "name": str(m.get("name", "")).strip() or "Unknown Medication",
            "dose": str(m.get("dose", "")).strip() or "Unknown dose",
            "frequency": str(m.get("frequency", "")).strip() or "Unknown frequency",
            "ndc": None,
        },
        "procedure": None,
        "prior_therapies": support.get("prior_therapies", []) if isinstance(support.get("prior_therapies"), list) else [],
        "labs": support.get("labs", {}) if isinstance(support.get("labs"), dict) else {},
        "imaging": support.get("imaging", {}) if isinstance(support.get("imaging"), dict) else {},
        "provider": {
            "name": str(provider.get("name", "")).strip() or "Unknown Provider",
            "npi": str(provider.get("npi", "")).strip() or "0000000000",
            "practice": "Unknown Practice",
            "phone": str(provider.get("phone", "")).strip() or "555-000-0000",
            "fax": str(provider.get("fax", "")).strip() or "555-000-0001",
        },
    }
    PatientChart(**chart)
    return chart


def _merge_chart(existing: dict[str, Any], extracted: dict[str, Any]) -> dict[str, Any]:
    merged = json.loads(json.dumps(existing))
    p = extracted.get("patient", {})
    i = extracted.get("insurance", {})
    d = extracted.get("diagnosis", {})
    m = extracted.get("medication", {})
    provider = extracted.get("provider", {})
    support = extracted.get("clinical_support", {})

    _set_if(merged, ["patient", "first_name"], p.get("first_name"))
    _set_if(merged, ["patient", "last_name"], p.get("last_name"))
    _set_if(merged, ["patient", "dob"], p.get("dob"))
    first = merged.get("patient", {}).get("first_name", "")
    last = merged.get("patient", {}).get("last_name", "")
    if first or last:
        merged["patient"]["name"] = f"{first} {last}".strip()

    _set_if(merged, ["insurance", "payer"], i.get("payer"))
    _set_if(merged, ["insurance", "member_id"], i.get("member_id"))
    _set_if(merged, ["insurance", "bin"], i.get("bin"))
    _set_if(merged, ["insurance", "pcn"], i.get("pcn"))
    _set_if(merged, ["insurance", "rx_group"], i.get("rx_group"))

    _set_if(merged, ["diagnosis", "icd10"], d.get("icd10"))
    _set_if(merged, ["diagnosis", "description"], d.get("description"))

    if "medication" not in merged or merged.get("medication") is None:
        merged["medication"] = {}
    _set_if(merged, ["medication", "name"], m.get("name"))
    _set_if(merged, ["medication", "dose"], m.get("dose"))
    _set_if(merged, ["medication", "frequency"], m.get("frequency"))

    _set_if(merged, ["provider", "name"], provider.get("name"))
    _set_if(merged, ["provider", "npi"], provider.get("npi"))
    _set_if(merged, ["provider", "phone"], provider.get("phone"))
    _set_if(merged, ["provider", "fax"], provider.get("fax"))

    if isinstance(support.get("prior_therapies"), list) and support.get("prior_therapies"):
        merged["prior_therapies"] = support["prior_therapies"]
    if isinstance(support.get("labs"), dict) and support.get("labs"):
        merged["labs"] = support["labs"]
    if isinstance(support.get("imaging"), dict) and support.get("imaging"):
        merged["imaging"] = support["imaging"]

    PatientChart(**merged)
    return merged


def _set_if(obj: dict[str, Any], path: list[str], value: Any) -> None:
    if value is None:
        return
    text = str(value).strip()
    if not text:
        return
    node = obj
    for key in path[:-1]:
        if key not in node or not isinstance(node[key], dict):
            node[key] = {}
        node = node[key]
    node[path[-1]] = text


async def _persist_patient_to_convex(chart: dict[str, Any], patient_created: bool) -> None:
    if not convex_client.enabled:
        return
    if not patient_created:
        return
    try:
        chart_model = PatientChart(**chart)
        args = {
            "mrn": chart_model.patient.mrn,
            "firstName": chart_model.patient.first_name,
            "lastName": chart_model.patient.last_name,
            "dob": chart_model.patient.dob,
            "insurance": {
                "payer": chart_model.insurance.payer,
                "memberId": chart_model.insurance.member_id,
                "bin": chart_model.insurance.bin,
                "pcn": chart_model.insurance.pcn,
                "rxGroup": chart_model.insurance.rx_group,
                "planName": chart_model.insurance.plan_name,
            },
            "diagnosis": {
                "icd10": chart_model.diagnosis.icd10,
                "description": chart_model.diagnosis.description,
            },
            "priorTherapies": chart_model.prior_therapies,
            "labs": chart_model.labs,
            "imaging": chart_model.imaging,
            "provider": {
                "name": chart_model.provider.name,
                "npi": chart_model.provider.npi,
                "practice": chart_model.provider.practice,
                "phone": chart_model.provider.phone,
                "fax": chart_model.provider.fax,
            },
            "chartJson": chart_model.model_dump_json(),
        }
        if chart_model.medication:
            args["medication"] = {
                "name": chart_model.medication.name,
                "ndc": chart_model.medication.ndc,
                "dose": chart_model.medication.dose,
                "frequency": chart_model.medication.frequency,
            }
        if chart_model.procedure:
            args["procedure"] = {
                "cpt": chart_model.procedure.cpt,
                "description": chart_model.procedure.description,
            }
        await convex_client.mutation("patients:create", args)
    except Exception:
        logger.warning("Failed to persist intake patient to Convex", exc_info=True)
