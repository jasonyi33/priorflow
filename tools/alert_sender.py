"""
Alert sender — Agentmail integration for PA status notifications.

Owned by Dev 2.
"""

import os
from datetime import datetime, UTC

import httpx

from shared.models import AlertPayload, Portal

AGENTMAIL_API_KEY = os.getenv("AGENTMAIL_API_KEY", "")
AGENTMAIL_ENDPOINT = "https://api.agentmail.to/v1/emails"


def _build_email_body(payload: AlertPayload) -> str:
    """Build HTML email body from alert payload."""
    status_colors = {
        "approved": "#22c55e",
        "denied": "#ef4444",
        "delayed": "#f59e0b",
        "error": "#ef4444",
        "submitted": "#3b82f6",
    }
    color = status_colors.get(payload.event_type, "#6b7280")

    return f"""
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: {color};">
        PA {payload.event_type.upper()}
      </h2>
      <p><strong>Patient:</strong> {payload.patient_name}
         ({payload.mrn})</p>
      <p><strong>Portal:</strong> {payload.portal.value}</p>
      <p><strong>Details:</strong> {payload.details}</p>
      <p style="color: #6b7280; font-size: 12px;">
        {payload.timestamp}
      </p>
    </div>
    """


async def send_pa_alert(payload: AlertPayload) -> bool:
    """Send a PA status alert. Uses Agentmail if configured,
    otherwise falls back to console logging."""
    # Console log always
    print(
        f"[ALERT] {payload.event_type.upper()}: "
        f"PA for {payload.patient_name} ({payload.mrn}) "
        f"on {payload.portal.value}"
    )
    print(f"  Details: {payload.details}")
    print(f"  Timestamp: {payload.timestamp}")

    if not AGENTMAIL_API_KEY:
        return True

    # Send via Agentmail API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                AGENTMAIL_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {AGENTMAIL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "subject": (
                        f"PA {payload.event_type.upper()}: "
                        f"{payload.patient_name}"
                    ),
                    "body": _build_email_body(payload),
                },
                timeout=10,
            )
            resp.raise_for_status()
            print(f"  Agentmail sent successfully")
            return True
    except Exception as e:
        print(f"  Agentmail failed: {e}")
        return True  # Don't fail the agent on email errors


def build_approval_alert(
    patient_name: str, mrn: str, portal: Portal, notes: str = ""
) -> AlertPayload:
    return AlertPayload(
        patient_name=patient_name,
        mrn=mrn,
        event_type="approved",
        portal=portal,
        details=f"PA approved. {notes}".strip(),
        timestamp=datetime.now(UTC),
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
        timestamp=datetime.now(UTC),
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
        timestamp=datetime.now(UTC),
    )
