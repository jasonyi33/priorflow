"""
Alert sender — Agentmail integration for PA status notifications.

Owned by Dev 2.
"""

from datetime import datetime

from shared.models import AlertPayload, Portal


async def send_pa_alert(payload: AlertPayload) -> bool:
    """Send a PA status alert via Agentmail.

    TODO: Dev 2 — Implement real Agentmail integration in Phase 3:
    1. Build HTML email template based on event_type
    2. Call Agentmail API to send
    3. Log success/failure
    """
    print(f"[ALERT] {payload.event_type.upper()}: "
          f"PA for {payload.patient_name} ({payload.mrn}) on {payload.portal.value}")
    print(f"  Details: {payload.details}")
    print(f"  Timestamp: {payload.timestamp}")
    return True


def build_approval_alert(
    patient_name: str, mrn: str, portal: Portal, notes: str = ""
) -> AlertPayload:
    return AlertPayload(
        patient_name=patient_name,
        mrn=mrn,
        event_type="approved",
        portal=portal,
        details=f"PA approved. {notes}".strip(),
        timestamp=datetime.utcnow(),
    )


def build_denial_alert(
    patient_name: str, mrn: str, portal: Portal, reason: str
) -> AlertPayload:
    return AlertPayload(
        patient_name=patient_name,
        mrn=mrn,
        event_type="denied",
        portal=portal,
        details=f"PA denied. Reason: {reason}",
        timestamp=datetime.utcnow(),
    )


def build_delay_alert(
    patient_name: str, mrn: str, portal: Portal, days_pending: int
) -> AlertPayload:
    return AlertPayload(
        patient_name=patient_name,
        mrn=mrn,
        event_type="delayed",
        portal=portal,
        details=f"PA has been pending for {days_pending} days without determination.",
        timestamp=datetime.utcnow(),
    )
