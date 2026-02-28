"""
Flexpa FHIR client — supplementary data source for patient
coverage and claims history.

Flexpa provides FHIR-based access to patient health records
(Coverage, ExplanationOfBenefit, etc.) via patient consent.
This client fetches structured data to enrich eligibility
and PA workflows.

Owned by Dev 2.
"""

import os
import logging
from typing import Any, Optional

import httpx

from shared.constants import FLEXPA_API_URL

logger = logging.getLogger(__name__)


class FlexpaClient:
    """Thin wrapper around the Flexpa FHIR API."""

    def __init__(self):
        self._secret_key = os.getenv("FLEXPA_SECRET_KEY", "")

    @property
    def enabled(self) -> bool:
        return bool(self._secret_key)

    async def get_coverage(
        self, access_token: str
    ) -> list[dict]:
        """Fetch Coverage resources for a patient.

        Returns a list of coverage records with fields like
        payer, plan, status, and subscriber info.
        """
        bundle = await self._fhir_search(
            "Coverage", access_token
        )
        return _extract_entries(bundle)

    async def get_claims(
        self, access_token: str
    ) -> list[dict]:
        """Fetch ExplanationOfBenefit (claims) for a patient.

        Returns a list of claims with status, provider,
        dates, and payment info.
        """
        bundle = await self._fhir_search(
            "ExplanationOfBenefit", access_token
        )
        return _extract_entries(bundle)

    async def get_patient(
        self, access_token: str
    ) -> Optional[dict]:
        """Fetch the Patient resource."""
        bundle = await self._fhir_search(
            "Patient", access_token
        )
        entries = _extract_entries(bundle)
        return entries[0] if entries else None

    async def _fhir_search(
        self, resource_type: str, access_token: str
    ) -> dict:
        """Execute a FHIR search request."""
        url = f"{FLEXPA_API_URL}/fhir/{resource_type}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/fhir+json",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()


def _extract_entries(bundle: dict) -> list[dict]:
    """Extract resource entries from a FHIR Bundle response."""
    if not bundle or bundle.get("resourceType") != "Bundle":
        return []
    return [
        entry["resource"]
        for entry in bundle.get("entry", [])
        if "resource" in entry
    ]


flexpa_client = FlexpaClient()
