"""Database client for agents — Convex-first with local file fallback."""

import json
from pathlib import Path

from shared.models import EligibilityResult, PARequest, PAStatusUpdate
from server.services.convex_client import convex_client

OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


async def save_eligibility_result(result: EligibilityResult) -> bool:
    payload = result.model_dump(mode="json")
    if convex_client.enabled:
        try:
            await convex_client.mutation(
                "eligibilityChecks:create",
                {
                    "mrn": payload["mrn"],
                    "portal": payload["portal"],
                    "payer": payload["payer"],
                    "coverageActive": payload["coverage_active"],
                    "copay": payload.get("copay"),
                    "deductible": payload.get("deductible"),
                    "outOfPocketMax": payload.get("out_of_pocket_max"),
                    "paRequired": payload["pa_required"],
                    "paRequiredReason": payload.get("pa_required_reason"),
                    "rawResponse": payload.get("raw_response"),
                    "checkedAt": _iso_to_ms(payload["checked_at"]),
                },
            )
            return True
        except Exception:
            pass
    _save_local(f"eligibility_{result.mrn}.json", payload)
    return True


async def save_pa_request(request: PARequest) -> bool:
    payload = request.model_dump(mode="json")
    if convex_client.enabled:
        try:
            await convex_client.mutation(
                "paRequests:create",
                {
                    "mrn": payload["mrn"],
                    "portal": payload["portal"],
                    "medicationOrProcedure": payload["medication_or_procedure"],
                    "status": payload["status"],
                    "fieldsFilled": payload.get("fields_filled", []),
                    "gapsDetected": payload.get("gaps_detected", []),
                    "justificationSummary": payload.get("justification_summary"),
                    "submissionId": payload.get("submission_id"),
                    "gifPath": payload.get("gif_path"),
                    "createdAt": _iso_to_ms(payload["created_at"]),
                    "updatedAt": _iso_to_ms(payload["updated_at"]),
                },
            )
            return True
        except Exception:
            pass
    _save_local(f"pa_submission_{request.mrn}.json", payload)
    return True


async def save_status_update(update: PAStatusUpdate) -> bool:
    payload = update.model_dump(mode="json")
    # No dedicated status table in current schema; keep local output for now.
    _save_local(f"status_{update.mrn}.json", payload)
    return True


def _save_local(filename: str, data: dict):
    output_file = OUTPUT_DIR / filename
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2, default=str)


def _iso_to_ms(value: str) -> int:
    # Accepts ISO8601 strings including "Z".
    from datetime import datetime

    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)
