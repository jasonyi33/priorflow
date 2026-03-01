"""
Alert sender — Agentmail SDK integration for PA status notifications.

Uses the Agentmail SDK to create per-PA inboxes, send threaded alerts,
and retrieve email history for audit. Falls back to console logging
when AGENTMAIL_API_KEY is not set.

Owned by Dev 2.
"""

import logging
import os
import time
from datetime import datetime, UTC
from typing import Optional

from agentmail.inboxes.types import CreateInboxRequest
from shared.models import AlertPayload, Portal

logger = logging.getLogger(__name__)

AGENTMAIL_API_KEY = os.getenv("AGENTMAIL_API_KEY", "")
NOTIFICATION_RECIPIENT = os.getenv(
    "NOTIFICATION_EMAIL", "clinic-notifications@agentmail.to"
)

# In-memory cache: mrn -> inbox_id
_pa_inboxes: dict[str, str] = {}
# In-memory cache: mrn -> thread_id (for threading alerts per PA case)
_pa_threads: dict[str, str] = {}

_client = None
_enabled: Optional[bool] = None


def _get_client():
    global _client, _enabled
    if _enabled is False:
        return None
    if _client is not None:
        return _client

    if not AGENTMAIL_API_KEY:
        _enabled = False
        logger.info("Agentmail disabled — no AGENTMAIL_API_KEY set")
        return None

    try:
        from agentmail import AgentMail
        _client = AgentMail(api_key=AGENTMAIL_API_KEY)
        _enabled = True
        return _client
    except ImportError:
        _enabled = False
        logger.warning("agentmail package not installed — email features disabled")
        return None
    except Exception:
        _enabled = False
        logger.warning("Failed to initialize Agentmail client", exc_info=True)
        return None


def _build_email_body(payload: AlertPayload) -> str:
    """Build plain text email body from alert payload."""
    lines = [
        f"PA {payload.event_type.upper()}",
        "",
        f"Patient: {payload.patient_name} ({payload.mrn})",
        f"Portal: {payload.portal.value}",
        f"Details: {payload.details}",
        f"Timestamp: {payload.timestamp}",
    ]
    return "\n".join(lines)


def create_pa_inbox(mrn: str) -> Optional[str]:
    """Create a dedicated Agentmail inbox for a PA case.

    Returns the inbox email address, or None if Agentmail is disabled.
    """
    client = _get_client()
    if not client:
        return None

    if mrn in _pa_inboxes:
        return _pa_inboxes[mrn]

    try:
        inbox = client.inboxes.create(
            request=CreateInboxRequest(
                username=f"pa-{mrn.lower()}"
            ),
        )
        _pa_inboxes[mrn] = inbox.inbox_id
        # Brief pause for inbox provisioning
        time.sleep(1)
        logger.info(
            "Created Agentmail inbox for %s: %s",
            mrn, inbox.inbox_id,
        )
        return inbox.inbox_id
    except Exception:
        logger.warning("Failed to create Agentmail inbox for %s", mrn, exc_info=True)
        return None


async def send_pa_alert(payload: AlertPayload) -> bool:
    """Send a PA status alert. Uses Agentmail SDK if configured,
    otherwise falls back to console logging."""
    # Console log always
    print(
        f"[ALERT] {payload.event_type.upper()}: "
        f"PA for {payload.patient_name} ({payload.mrn}) "
        f"on {payload.portal.value}"
    )
    print(f"  Details: {payload.details}")
    print(f"  Timestamp: {payload.timestamp}")

    client = _get_client()
    if not client:
        return True

    try:
        # Ensure we have an inbox for this PA case
        inbox_id = _pa_inboxes.get(payload.mrn)
        if not inbox_id:
            inbox_id = create_pa_inbox(payload.mrn)
        if not inbox_id:
            return True  # Fall back silently

        subject = (
            f"PA {payload.event_type.upper()}: "
            f"{payload.patient_name}"
        )
        body = _build_email_body(payload)

        client.inboxes.messages.send(
            inbox_id=inbox_id,
            to=NOTIFICATION_RECIPIENT,
            subject=subject,
            text=body,
        )

        logger.info("Agentmail alert sent for %s", payload.mrn)
        return True
    except Exception:
        logger.warning("Agentmail send failed", exc_info=True)
        return True  # Don't fail the agent on email errors


def get_pa_email_history(mrn: str) -> list[dict]:
    """Retrieve email history for a PA case inbox.

    Returns a list of message summaries, or empty list if unavailable.
    """
    client = _get_client()
    inbox_id = _pa_inboxes.get(mrn)
    if not client or not inbox_id:
        return []

    try:
        response = client.inboxes.threads.list(
            inbox_id=inbox_id,
        )
        result = []
        for t in response.threads:
            result.append({
                "thread_id": t.thread_id,
                "subject": t.subject or "",
                "message_count": t.message_count,
                "last_updated": str(t.updated_at),
            })
        return result
    except Exception:
        logger.warning("Failed to retrieve email history for %s", mrn, exc_info=True)
        return []


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
        details=(
            f"PA has been pending for {days_pending} days "
            f"without determination."
        ),
        timestamp=datetime.now(UTC),
    )
