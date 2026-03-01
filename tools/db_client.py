"""Database client for agents — Convex-first with local file fallback."""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path

from shared.models import EligibilityResult, PARequest, PAStatusEnum, PAStatusUpdate, Portal
from server.services.convex_client import convex_client
from tools.chart_loader import load_chart

OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
logger = logging.getLogger(__name__)


async def save_eligibility_result(result: EligibilityResult) -> bool:
    payload = result.model_dump(mode="json")
    saved_to_convex = False
    if convex_client.enabled:
        try:
            args = {
                "mrn": payload["mrn"],
                "portal": payload["portal"],
                "payer": payload["payer"],
                "coverageActive": payload["coverage_active"],
                "paRequired": payload["pa_required"],
                "checkedAt": _iso_to_ms(payload["checked_at"]),
            }
            if payload.get("copay") is not None:
                args["copay"] = payload["copay"]
            if payload.get("deductible") is not None:
                args["deductible"] = payload["deductible"]
            if payload.get("out_of_pocket_max") is not None:
                args["outOfPocketMax"] = payload["out_of_pocket_max"]
            if payload.get("pa_required_reason") is not None:
                args["paRequiredReason"] = payload["pa_required_reason"]
            if payload.get("raw_response") is not None:
                args["rawResponse"] = payload["raw_response"]
            await convex_client.mutation(
                "eligibilityChecks:upsert",
                args,
            )
            saved_to_convex = True
        except Exception:
            logger.warning("Failed to persist eligibility result to Convex", exc_info=True)

    if not saved_to_convex:
        _save_local(f"eligibility_{result.mrn}.json", payload)

    await ensure_pa_request_entry(
        mrn=result.mrn,
        portal=Portal.COVERMYMEDS,
        status=PAStatusEnum.PENDING,
        updated_at=payload["checked_at"],
    )
    return True


async def save_pa_request(request: PARequest) -> bool:
    payload = request.model_dump(mode="json")
    await _persist_pa_request_payload(payload)
    return True


async def save_status_update(update: PAStatusUpdate) -> bool:
    payload = update.model_dump(mode="json")
    # No dedicated status table in current schema; keep local output for now.
    _save_local(f"status_{update.mrn}.json", payload)
    await ensure_pa_request_entry(
        mrn=update.mrn,
        portal=update.portal,
        status=update.status,
        updated_at=payload["checked_at"],
    )
    return True


async def ensure_pa_request_entry(
    mrn: str,
    portal: Portal = Portal.COVERMYMEDS,
    status: PAStatusEnum = PAStatusEnum.PENDING,
    updated_at: str | None = None,
) -> bool:
    existing = await _load_existing_pa_request(mrn, portal)
    now_iso = updated_at or datetime.now(UTC).isoformat()

    payload = {
        "mrn": mrn,
        "portal": portal.value,
        "medication_or_procedure": (
            existing.get("medication_or_procedure")
            or _load_medication_or_procedure(mrn)
        ),
        "status": _merge_status(existing.get("status"), status.value),
        "fields_filled": existing.get("fields_filled", []),
        "gaps_detected": existing.get("gaps_detected", []),
        "justification_summary": existing.get("justification_summary"),
        "submission_id": existing.get("submission_id"),
        "gif_path": existing.get("gif_path"),
        "created_at": existing.get("created_at", now_iso),
        "updated_at": now_iso,
    }
    await _persist_pa_request_payload(payload)
    return True


def _save_local(filename: str, data: dict):
    output_file = OUTPUT_DIR / filename
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2, default=str)


def _iso_to_ms(value: str) -> int:
    # Accepts ISO8601 strings including "Z".
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)


async def _persist_pa_request_payload(payload: dict) -> None:
    if convex_client.enabled:
        try:
            args = {
                "mrn": payload["mrn"],
                "portal": payload["portal"],
                "medicationOrProcedure": payload["medication_or_procedure"],
                "status": payload["status"],
                "fieldsFilled": payload.get("fields_filled", []),
                "gapsDetected": payload.get("gaps_detected", []),
                "createdAt": _iso_to_ms(payload["created_at"]),
                "updatedAt": _iso_to_ms(payload["updated_at"]),
            }
            if payload.get("justification_summary") is not None:
                args["justificationSummary"] = payload["justification_summary"]
            if payload.get("submission_id") is not None:
                args["submissionId"] = payload["submission_id"]
            if payload.get("gif_path") is not None:
                args["gifPath"] = payload["gif_path"]
            try:
                await convex_client.mutation(
                    "paRequests:upsertByMrnPortal",
                    args,
                )
                return
            except Exception:
                logger.warning(
                    "Failed to upsert PA request in Convex; trying paRequests:create",
                    exc_info=True,
                )
                await convex_client.mutation(
                    "paRequests:create",
                    args,
                )
                return
        except Exception:
            logger.warning("Failed to persist PA request to Convex", exc_info=True)
    _save_local(f"pa_submission_{payload['mrn']}.json", payload)


async def _load_existing_pa_request(mrn: str, portal: Portal) -> dict:
    local_path = OUTPUT_DIR / f"pa_submission_{mrn}.json"
    if local_path.exists():
        try:
            with open(local_path) as f:
                data = json.load(f)
            if data.get("portal") == portal.value:
                return data
        except Exception:
            pass

    if convex_client.enabled:
        try:
            records = await convex_client.query("paRequests:getByMrn", {"mrn": mrn})
            for record in records or []:
                if record.get("portal") == portal.value:
                    return _normalize_convex_pa_request(record)
        except Exception:
            pass

    return {}


def _normalize_convex_pa_request(record: dict) -> dict:
    created_at = record.get("created_at")
    if created_at is None and record.get("createdAt") is not None:
        created_at = _ms_to_iso(record["createdAt"])

    updated_at = record.get("updated_at")
    if updated_at is None and record.get("updatedAt") is not None:
        updated_at = _ms_to_iso(record["updatedAt"])

    return {
        "mrn": record.get("mrn", ""),
        "portal": record.get("portal", Portal.COVERMYMEDS.value),
        "medication_or_procedure": record.get("medication_or_procedure")
        or record.get("medicationOrProcedure", ""),
        "status": record.get("status", PAStatusEnum.PENDING.value),
        "fields_filled": record.get("fields_filled") or record.get("fieldsFilled", []),
        "gaps_detected": record.get("gaps_detected") or record.get("gapsDetected", []),
        "justification_summary": record.get("justification_summary")
        or record.get("justificationSummary"),
        "submission_id": record.get("submission_id") or record.get("submissionId"),
        "gif_path": record.get("gif_path") or record.get("gifPath"),
        "created_at": created_at or datetime.now(UTC).isoformat(),
        "updated_at": updated_at or created_at or datetime.now(UTC).isoformat(),
    }


def _load_medication_or_procedure(mrn: str) -> str:
    try:
        chart = load_chart(mrn)
    except Exception:
        return ""

    if chart.medication:
        return f"{chart.medication.name} {chart.medication.dose}".strip()
    if chart.procedure:
        return chart.procedure.description
    return ""


def _merge_status(existing_status: str | None, incoming_status: str) -> str:
    if not existing_status:
        return incoming_status

    status_rank = {
        PAStatusEnum.PENDING.value: 0,
        PAStatusEnum.SUBMITTED.value: 1,
        PAStatusEnum.MORE_INFO_NEEDED.value: 2,
        PAStatusEnum.APPROVED.value: 3,
        PAStatusEnum.DENIED.value: 3,
        PAStatusEnum.CANCELLED.value: 3,
    }
    existing_rank = status_rank.get(existing_status, 0)
    incoming_rank = status_rank.get(incoming_status, 0)
    if incoming_rank < existing_rank:
        return existing_status
    return incoming_status


def _ms_to_iso(value: int) -> str:
    return datetime.fromtimestamp(value / 1000, tz=UTC).isoformat()
