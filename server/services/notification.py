"""
Notification service — sends alerts via Agentmail.

Owned by Dev 1. Skeleton for Phase 3 implementation.
"""

from shared.models import AlertPayload
from server.config import settings


async def send_alert(payload: AlertPayload) -> bool:
    """Send a PA status alert via Agentmail.

    TODO: Dev 1 — Implement in Phase 3:
    1. Format email from AlertPayload
    2. Call Agentmail API to send
    3. Return success/failure
    """
    print(f"[ALERT] {payload.event_type.upper()}: "
          f"PA for {payload.patient_name} on {payload.portal.value} — "
          f"{payload.details}")
    return True
