"""
Eligibility response parser — extracts structured data from
Stedi and Claim.MD eligibility responses.

Owned by Dev 2.
"""

from datetime import datetime
from typing import Optional

from shared.models import EligibilityResult, Portal


def parse_stedi_response(mrn: str, raw_response: str) -> EligibilityResult:
    """Parse a Stedi test mode eligibility response into structured data.

    TODO: Dev 2 — Implement in Phase 1:
    Extract from Stedi response:
    - Coverage status (active/inactive)
    - Copay, deductible, out-of-pocket max
    - PA requirements for the requested service
    """
    # Placeholder — Dev 2 implements based on actual Stedi response format
    return EligibilityResult(
        mrn=mrn,
        portal=Portal.STEDI,
        payer="Unknown",
        coverage_active=True,
        pa_required=False,
        raw_response=raw_response,
        checked_at=datetime.utcnow(),
    )


def parse_claimmd_response(mrn: str, raw_response: str) -> EligibilityResult:
    """Parse a Claim.MD test account eligibility response.

    TODO: Dev 2 — Implement in Phase 2:
    Extract from Claim.MD response:
    - Coverage confirmation
    - Benefit details
    - Rejection codes (if any)
    - PA flags
    """
    return EligibilityResult(
        mrn=mrn,
        portal=Portal.CLAIMMD,
        payer="Unknown",
        coverage_active=True,
        pa_required=False,
        raw_response=raw_response,
        checked_at=datetime.utcnow(),
    )
