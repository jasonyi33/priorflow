"""MiniMax PDF extraction orchestration and normalization."""

from __future__ import annotations

import json
import re
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from tools.minimax_client import MiniMaxClient, MiniMaxClientError


OUTPUT_DIR = Path("output") / "minimax"


def extract_pdf_to_pa_fields(pdf_path: Path) -> dict[str, Any]:
    """Extract normalized PA fields from a PDF chart."""
    client = MiniMaxClient()
    raw_text = _extract_pdf_text_local(pdf_path)

    if not raw_text.strip():
        raise MiniMaxClientError("No extractable text found in uploaded PDF")

    file_id = "local_pdf"
    extracted = client.chat_extract_structured(raw_text)
    normalized = _normalize_extraction(extracted, file_id=file_id)
    return _fill_missing_from_text(raw_text, normalized)


def save_extraction(mrn: str, extraction: dict[str, Any]) -> Path:
    """Persist normalized extraction payload for later prompt enrichment."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{mrn}_extraction.json"
    with path.open("w") as f:
        json.dump(extraction, f, indent=2, default=str)
    return path


def _normalize_extraction(data: dict[str, Any], file_id: str) -> dict[str, Any]:
    def _as_dict(value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}

    def _as_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return []

    patient = _as_dict(data.get("patient"))
    insurance = _as_dict(data.get("insurance"))
    diagnosis = _as_dict(data.get("diagnosis"))
    medication = _as_dict(data.get("medication"))
    provider = _as_dict(data.get("provider"))
    clinical_support = _as_dict(data.get("clinical_support"))
    confidence = _as_dict(data.get("confidence"))

    def _pick(obj: dict[str, Any], *keys: str) -> str:
        for key in keys:
            value = obj.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
        return ""

    # Handle alternate key styles frequently returned by LLMs.
    if not clinical_support:
        clinical_support = _as_dict(data.get("clinicalSupport"))
    prior_therapies = clinical_support.get("prior_therapies")
    if prior_therapies is None:
        prior_therapies = clinical_support.get("priorTherapies")

    normalized: dict[str, Any] = {
        "patient": {
            "first_name": _pick(patient, "first_name", "firstName"),
            "last_name": _pick(patient, "last_name", "lastName"),
            "dob": _pick(patient, "dob", "date_of_birth", "dateOfBirth"),
            "gender": _pick(patient, "gender"),
        },
        "insurance": {
            "payer": _pick(insurance, "payer"),
            "member_id": _pick(insurance, "member_id", "memberId"),
            "bin": _pick(insurance, "bin", "BIN"),
            "pcn": _pick(insurance, "pcn", "PCN"),
            "rx_group": _pick(insurance, "rx_group", "rxGroup", "RxGroup"),
        },
        "diagnosis": {
            "icd10": _pick(diagnosis, "icd10", "icd_10", "ICD10"),
            "description": _pick(diagnosis, "description"),
        },
        "medication": {
            "name": _pick(medication, "name"),
            "dose": _pick(medication, "dose"),
            "frequency": _pick(medication, "frequency"),
            "quantity": _pick(medication, "quantity"),
            "days_supply": _pick(medication, "days_supply", "daysSupply"),
            "dosage_form": _pick(medication, "dosage_form", "dosageForm"),
        },
        "provider": {
            "name": _pick(provider, "name"),
            "npi": _pick(provider, "npi", "NPI"),
            "phone": _pick(provider, "phone"),
            "fax": _pick(provider, "fax"),
        },
        "clinical_support": {
            "prior_therapies": _as_list(prior_therapies),
            "labs": clinical_support.get("labs", {}) if isinstance(clinical_support.get("labs"), dict) else {},
            "imaging": clinical_support.get("imaging", {}) if isinstance(clinical_support.get("imaging"), dict) else {},
        },
        "confidence": confidence,
        "missing_fields": _as_list(data.get("missing_fields")),
        "source": {
            "minimax_file_id": file_id,
            "extracted_at": datetime.now(UTC).isoformat(),
        },
    }

    required_paths = [
        "patient.first_name",
        "patient.last_name",
        "patient.dob",
        "insurance.member_id",
        "diagnosis.icd10",
        "provider.npi",
    ]
    missing = set(normalized["missing_fields"])
    for path in required_paths:
        node = normalized
        for segment in path.split("."):
            node = node.get(segment, "")
        if not str(node).strip():
            missing.add(path)
    normalized["missing_fields"] = sorted(missing)
    return normalized


def _extract_pdf_text_local(pdf_path: Path) -> str:
    """Extract text directly from PDF file using local parser."""
    try:
        reader = PdfReader(str(pdf_path))
        text_parts: list[str] = []
        for page in reader.pages:
            try:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_parts.append(page_text)
            except Exception:
                continue
        return "\n\n".join(text_parts).strip()
    except Exception as exc:  # noqa: BLE001
        raise MiniMaxClientError(f"Local PDF extraction failed: {exc}") from exc


def _fill_missing_from_text(raw_text: str, normalized: dict[str, Any]) -> dict[str, Any]:
    """Use lightweight regex extraction to backfill fields MiniMax leaves empty.

    MiniMax remains primary source; this only fills blank fields when explicit labels
    are present in chart text.
    """
    def _search(pattern: str) -> str:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        return match.group(1).strip() if match else ""

    patient = normalized.get("patient", {})
    insurance = normalized.get("insurance", {})
    diagnosis = normalized.get("diagnosis", {})
    medication = normalized.get("medication", {})
    provider = normalized.get("provider", {})
    support = normalized.get("clinical_support", {})

    if not patient.get("first_name"):
        patient["first_name"] = _search(r"First\s+Name\s*:\s*([^\n]+)")
    if not patient.get("last_name"):
        patient["last_name"] = _search(r"Last\s+Name\s*:\s*([^\n]+)")
    if not patient.get("dob"):
        patient["dob"] = _search(r"(?:Date\s+of\s+Birth|DOB)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})")
    if not patient.get("gender"):
        patient["gender"] = _search(r"Gender\s*:\s*([^\n]+)")

    if not insurance.get("payer"):
        insurance["payer"] = _search(r"Insurance\s+Payer\s*:\s*([^\n]+)")
    if not insurance.get("member_id"):
        insurance["member_id"] = _search(r"(?:Insurance\s+Member\s+ID|Member\s+ID)\s*:\s*([^\n]+)")
    if not insurance.get("bin"):
        insurance["bin"] = _search(r"\bBIN\s*:\s*([^\s\n]+)")
    if not insurance.get("pcn"):
        insurance["pcn"] = _search(r"\bPCN\s*:\s*([^\s\n]+)")
    if not insurance.get("rx_group"):
        insurance["rx_group"] = _search(r"(?:Rx\s*Group|RxGroup|RXGROUP)\s*:\s*([^\s\n]+)")

    if not diagnosis.get("icd10"):
        diagnosis["icd10"] = _search(r"(?:Diagnosis\s+)?ICD[- ]?10\s*:\s*([^\s\n]+)")
    if not diagnosis.get("description"):
        diagnosis["description"] = _search(r"Diagnosis\s+Description\s*:\s*([^\n]+)")

    if not medication.get("name"):
        medication["name"] = _search(r"Medication\s+Name\s*:\s*([^\n]+)")
    if not medication.get("dose"):
        medication["dose"] = _search(r"\bDose\s*:\s*([^\n]+)")
    if not medication.get("frequency"):
        medication["frequency"] = _search(r"Frequency\s*:\s*([^\n]+)")
    if not medication.get("quantity"):
        medication["quantity"] = _search(r"Quantity\s*:\s*([^\n]+)")
    if not medication.get("days_supply"):
        medication["days_supply"] = _search(r"Days\s+Supply\s*:\s*([^\n]+)")
    if not medication.get("dosage_form"):
        medication["dosage_form"] = _search(r"Dosage\s+Form\s*:\s*([^\n]+)")

    if not provider.get("name"):
        provider["name"] = _search(r"Provider\s+Name\s*:\s*([^\n]+)")
    if not provider.get("npi"):
        provider["npi"] = _search(r"Provider\s+NPI\s*:\s*([^\s\n]+)")
    if not provider.get("phone"):
        provider["phone"] = _search(r"Provider\s+Phone\s*:\s*([^\n]+)")
    if not provider.get("fax"):
        provider["fax"] = _search(r"Provider\s+Fax\s*:\s*([^\n]+)")

    if not support.get("prior_therapies"):
        therapies = _search(r"Prior\s+Therapies\s*:\s*([^\n]+)")
        if therapies:
            support["prior_therapies"] = [part.strip() for part in therapies.split(",") if part.strip()]

    normalized["patient"] = patient
    normalized["insurance"] = insurance
    normalized["diagnosis"] = diagnosis
    normalized["medication"] = medication
    normalized["provider"] = provider
    normalized["clinical_support"] = support

    # Recompute missing fields after backfill.
    required_paths = [
        "patient.first_name",
        "patient.last_name",
        "patient.dob",
        "insurance.member_id",
        "diagnosis.icd10",
        "provider.npi",
    ]
    missing = set(normalized.get("missing_fields", []))
    for path in required_paths:
        node: Any = normalized
        for segment in path.split("."):
            node = node.get(segment, "") if isinstance(node, dict) else ""
        if str(node).strip():
            missing.discard(path)
        else:
            missing.add(path)
    normalized["missing_fields"] = sorted(missing)
    return normalized
