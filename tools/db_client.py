"""
Database client for agents — API-first with local file fallback.

Agents call these helpers to persist results. We attempt to hit the
FastAPI endpoints (which write to Convex). If the API is unreachable,
we fall back to local output files.

Owned by Dev 1.
"""

import json
import httpx
from pathlib import Path
from typing import Optional

from shared.models import EligibilityResult, PARequest, PAStatusUpdate
from shared.constants import BACKEND_PORT

OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

API_BASE = f"http://localhost:{BACKEND_PORT}/api"


async def save_eligibility_result(result: EligibilityResult) -> bool:
    payload = result.model_dump(mode="json")
    if await _post_json("/eligibility", payload):
        return True
    _save_local(f"eligibility_{result.mrn}.json", payload)
    return True


async def save_pa_request(request: PARequest) -> bool:
    payload = request.model_dump(mode="json")
    if await _post_json("/pa", payload):
        return True
    _save_local(f"pa_submission_{request.mrn}.json", payload)
    return True


async def save_status_update(update: PAStatusUpdate) -> bool:
    payload = update.model_dump(mode="json")
    if await _post_json("/pa/status", payload):
        return True
    _save_local(f"status_{update.mrn}.json", payload)
    return True


async def _post_json(path: str, data: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(f"{API_BASE}{path}", json=data)
            return resp.status_code < 300
    except Exception:
        return False


def _save_local(filename: str, data: dict):
    output_file = OUTPUT_DIR / filename
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2, default=str)
