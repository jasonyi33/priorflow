"""
Background scheduler for periodic PA status checks.

Queries for PAs with status "submitted" or "pending" and dispatches
status check agents. Runs as an asyncio background task within the
FastAPI lifespan.

Owned by Dev 1.
"""

import asyncio
import json
import logging
from pathlib import Path

from shared.constants import STATUS_CHECK_INTERVAL
from server.services.convex_client import convex_client
from server.services import orchestrator

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("output")
CHECKABLE_STATUSES = {"submitted", "pending"}


async def _get_pending_mrns() -> list[str]:
    """Query for MRNs with submitted/pending PAs."""
    mrns: set[str] = set()

    if convex_client.enabled:
        try:
            for status in CHECKABLE_STATUSES:
                results = await convex_client.query(
                    "paRequests:getByStatus", {"status": status}
                )
                for pa in (results or []):
                    mrn = pa.get("mrn")
                    if mrn:
                        mrns.add(mrn)
            if mrns:
                return list(mrns)
        except Exception:
            logger.warning(
                "Convex query failed in scheduler, "
                "falling back to local files",
                exc_info=True,
            )

    # Local file fallback
    for path in OUTPUT_DIR.glob("pa_submission_*.json"):
        try:
            with open(path) as f:
                data = json.load(f)
            if data.get("status") in CHECKABLE_STATUSES:
                mrn = data.get("mrn")
                if mrn:
                    mrns.add(mrn)
        except Exception:
            continue

    return list(mrns)


def _is_check_already_running(mrn: str) -> bool:
    """Return True if a status-check task is active for this MRN."""
    for run_id, task in orchestrator._running_tasks.items():
        if run_id.startswith(f"status-{mrn}") and not task.done():
            return True
    return False


async def run_scheduler():
    """Main scheduler loop. Runs until cancelled."""
    logger.info(
        "Scheduler started (interval=%ds)", STATUS_CHECK_INTERVAL
    )
    while True:
        try:
            mrns = await _get_pending_mrns()
            logger.info("Scheduler cycle: %d pending MRNs", len(mrns))
            for mrn in mrns:
                if _is_check_already_running(mrn):
                    logger.debug(
                        "Skipping %s (check already running)", mrn
                    )
                    continue
                logger.info("Dispatching status check for %s", mrn)
                try:
                    await orchestrator.dispatch_status_check(mrn)
                except Exception:
                    logger.warning(
                        "Failed to dispatch check for %s",
                        mrn,
                        exc_info=True,
                    )
        except Exception:
            logger.error("Scheduler cycle failed", exc_info=True)

        await asyncio.sleep(STATUS_CHECK_INTERVAL)
