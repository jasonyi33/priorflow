"""
Agent orchestration service.

Dispatches Browser Use agents as async background tasks,
tracks their runs, and chains eligibility -> PA -> status flows.

Owned by Dev 1. Skeleton for Phase 1-2 implementation.
"""

import asyncio
from datetime import datetime
from typing import Optional

from shared.models import AgentType, Portal, AgentRun


async def dispatch_eligibility(mrn: str, portal: Portal = Portal.STEDI) -> str:
    """Dispatch Agent 1 (Eligibility Checker) as a background task.

    Returns the run_id for tracking.

    TODO: Dev 1 — Implement in Phase 2:
    1. Create AgentRun record in Convex (status: started)
    2. Spawn asyncio task that runs the eligibility agent
    3. On completion, update AgentRun (status: completed/failed)
    4. Write EligibilityResult to Convex
    """
    run_id = f"elig-{mrn}-{int(datetime.utcnow().timestamp())}"
    # TODO: implement
    return run_id


async def dispatch_pa_submission(mrn: str, portal: Portal = Portal.COVERMYMEDS) -> str:
    """Dispatch Agent 2 (PA Form Filler) as a background task.

    Returns the run_id for tracking.

    TODO: Dev 1 — Implement in Phase 2:
    1. Create AgentRun record in Convex
    2. Spawn asyncio task that runs the PA form filler agent
    3. On completion, update AgentRun and write PARequest to Convex
    """
    run_id = f"pa-{mrn}-{int(datetime.utcnow().timestamp())}"
    # TODO: implement
    return run_id


async def dispatch_status_check(mrn: str, portal: Optional[Portal] = None) -> str:
    """Dispatch Agent 3 (Status Monitor) as a background task.

    Returns the run_id for tracking.

    TODO: Dev 1 — Implement in Phase 2:
    1. Create AgentRun record
    2. Spawn status monitor agent
    3. On status change, write PAStatusUpdate + trigger alerts
    """
    run_id = f"status-{mrn}-{int(datetime.utcnow().timestamp())}"
    # TODO: implement
    return run_id


async def dispatch_full_flow(mrn: str) -> dict:
    """Run the full pipeline: eligibility -> PA submission -> status monitoring.

    TODO: Dev 1 — Implement in Phase 2:
    1. Run eligibility check, wait for result
    2. If PA required, run PA form filler
    3. After submission, start status monitoring
    """
    elig_run_id = await dispatch_eligibility(mrn)
    # TODO: await eligibility completion, check if PA required
    pa_run_id = await dispatch_pa_submission(mrn)
    # TODO: await PA submission, start monitoring
    status_run_id = await dispatch_status_check(mrn)

    return {
        "eligibility_run_id": elig_run_id,
        "pa_run_id": pa_run_id,
        "status_run_id": status_run_id,
    }
