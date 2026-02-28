"""
Eligibility response parser — extracts structured data from
Stedi and Claim.MD eligibility responses.

Owned by Dev 2.
"""

import re
from datetime import datetime, UTC

from shared.models import EligibilityResult, Portal
from tools.chart_loader import load_chart


def _extract_field(text: str, patterns: list[str]) -> str | None:
    """Try multiple regex patterns against text, return first match."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _detect_coverage_active(text: str) -> bool:
    lower = text.lower()
    if any(kw in lower for kw in ["inactive", "not active", "terminated", "no coverage"]):
        return False
    return True


def _detect_pa_required(text: str) -> tuple[bool, str | None]:
    lower = text.lower()
    pa_keywords = [
        "prior authorization required",
        "pa required",
        "requires prior authorization",
        "pre-authorization required",
        "precertification required",
        "step therapy",
    ]
    for kw in pa_keywords:
        if kw in lower:
            return True, kw.replace("required", "").strip().capitalize() or "Prior authorization required"
    return False, None


def parse_stedi_response(mrn: str, raw_response: str) -> EligibilityResult:
    """Parse a Stedi test mode eligibility response into structured data."""
    # Get payer from chart
    try:
        chart = load_chart(mrn)
        payer = chart.insurance.payer
    except FileNotFoundError:
        payer = "Unknown"

    coverage_active = _detect_coverage_active(raw_response)
    pa_required, pa_reason = _detect_pa_required(raw_response)

    copay = _extract_field(raw_response, [
        r"copay[:\s]*\$?([\d,.]+[^.\n]*)",
        r"\$([\d,.]+)\s*(?:copay|co-pay)",
    ])
    deductible = _extract_field(raw_response, [
        r"deductible[:\s]*\$?([\d,.]+[^.\n]*)",
        r"\$([\d,.]+)\s*deductible",
    ])
    oop_max = _extract_field(raw_response, [
        r"out.of.pocket[^:]*[:\s]*\$?([\d,.]+[^.\n]*)",
        r"oop[^:]*[:\s]*\$?([\d,.]+[^.\n]*)",
    ])

    return EligibilityResult(
        mrn=mrn,
        portal=Portal.STEDI,
        payer=payer,
        coverage_active=coverage_active,
        copay=copay,
        deductible=deductible,
        out_of_pocket_max=oop_max,
        pa_required=pa_required,
        pa_required_reason=pa_reason,
        raw_response=raw_response,
        checked_at=datetime.now(UTC),
    )


def parse_claimmd_response(mrn: str, raw_response: str) -> EligibilityResult:
    """Parse a Claim.MD test account eligibility response."""
    try:
        chart = load_chart(mrn)
        payer = chart.insurance.payer
    except FileNotFoundError:
        payer = "Unknown"

    coverage_active = _detect_coverage_active(raw_response)
    pa_required, pa_reason = _detect_pa_required(raw_response)

    # Claim.MD rejection detection
    lower = raw_response.lower()
    if any(kw in lower for kw in ["rejected", "denial", "rejected claim"]):
        coverage_active = False

    copay = _extract_field(raw_response, [
        r"copay[:\s]*\$?([\d,.]+[^.\n]*)",
    ])
    deductible = _extract_field(raw_response, [
        r"deductible[:\s]*\$?([\d,.]+[^.\n]*)",
    ])

    return EligibilityResult(
        mrn=mrn,
        portal=Portal.CLAIMMD,
        payer=payer,
        coverage_active=coverage_active,
        copay=copay,
        deductible=deductible,
        pa_required=pa_required,
        pa_required_reason=pa_reason,
        raw_response=raw_response,
        checked_at=datetime.now(UTC),
    )
