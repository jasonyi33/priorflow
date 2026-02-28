"""
Database client for agents — bridges agent output to the API server.

Agents call these functions to persist results. In production, these call
the FastAPI endpoints which write to Convex. For standalone testing,
they fall back to local file output.

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
    """Save eligibility result — tries API first, falls back to file.

    TODO: Dev 1 — Implement API call in Phase 2.
    """
    # Fallback: save to local file
    output_file = OUTPUT_DIR / f"eligibility_{result.mrn}.json"
    with open(output_file, "w") as f:
        json.dump(result.model_dump(), f, indent=2, default=str)
    return True


async def save_pa_request(request: PARequest) -> bool:
    """Save PA request result — tries API first, falls back to file.

    TODO: Dev 1 — Implement API call in Phase 2.
    """
    output_file = OUTPUT_DIR / f"pa_submission_{request.mrn}.json"
    with open(output_file, "w") as f:
        json.dump(request.model_dump(), f, indent=2, default=str)
    return True


async def save_status_update(update: PAStatusUpdate) -> bool:
    """Save status update — tries API first, falls back to file.

    TODO: Dev 1 — Implement API call in Phase 2.
    """
    output_file = OUTPUT_DIR / f"status_{update.mrn}.json"
    with open(output_file, "w") as f:
        json.dump(update.model_dump(), f, indent=2, default=str)
    return True
