"""
Shared data models for PriorFlow.

PROTECTED FILE — Only Dev 1 (Infrastructure Architect) modifies this file.
Other devs request changes verbally or via PR comment.
New fields MUST be added as Optional with defaults to avoid breaking other devs.

All agents, the server, and tools import from this module.
"""

from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


# ──────────────────────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────────────────────

class PAStatusEnum(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DENIED = "denied"
    MORE_INFO_NEEDED = "more_info_needed"
    CANCELLED = "cancelled"


class AgentType(str, Enum):
    ELIGIBILITY = "eligibility"
    PA_FORM_FILLER = "pa_form_filler"
    STATUS_MONITOR = "status_monitor"


class Portal(str, Enum):
    STEDI = "stedi"
    CLAIMMD = "claimmd"
    COVERMYMEDS = "covermymeds"
    MOCK = "mock"


# ──────────────────────────────────────────────────────────────
# Patient Chart Components
# ──────────────────────────────────────────────────────────────

class PatientInfo(BaseModel):
    name: str
    first_name: str
    last_name: str
    dob: str  # Format: YYYY-MM-DD
    mrn: str


class InsuranceInfo(BaseModel):
    payer: str
    member_id: str
    bin: str
    pcn: str
    rx_group: str
    plan_name: Optional[str] = None


class DiagnosisInfo(BaseModel):
    icd10: str
    description: str


class MedicationInfo(BaseModel):
    name: str
    ndc: Optional[str] = None
    dose: str
    frequency: str


class ProcedureInfo(BaseModel):
    cpt: str
    description: str


class ProviderInfo(BaseModel):
    name: str
    npi: str
    practice: str
    phone: str
    fax: str


class PatientChart(BaseModel):
    """Full mock EMR record. Used by all agents to load patient data."""

    patient: PatientInfo
    insurance: InsuranceInfo
    diagnosis: DiagnosisInfo
    medication: Optional[MedicationInfo] = None
    procedure: Optional[ProcedureInfo] = None
    prior_therapies: list[str] = []
    labs: dict[str, str] = {}
    imaging: dict[str, str] = {}
    provider: ProviderInfo


# ──────────────────────────────────────────────────────────────
# Cross-Agent Data Contracts
# ──────────────────────────────────────────────────────────────

class EligibilityResult(BaseModel):
    """Output of Agent 1 (Eligibility Checker).
    Consumed by Agent 2, the server, and the frontend."""

    mrn: str
    portal: Portal
    payer: str
    coverage_active: bool
    copay: Optional[str] = None
    deductible: Optional[str] = None
    out_of_pocket_max: Optional[str] = None
    pa_required: bool
    pa_required_reason: Optional[str] = None
    raw_response: Optional[str] = None
    checked_at: datetime


class PARequest(BaseModel):
    """Output of Agent 2 (PA Form Filler).
    Written to DB after form submission."""

    id: Optional[str] = None
    mrn: str
    portal: Portal
    medication_or_procedure: str
    status: PAStatusEnum = PAStatusEnum.PENDING
    fields_filled: list[str] = []
    gaps_detected: list[str] = []
    justification_summary: Optional[str] = None
    submission_id: Optional[str] = None
    gif_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PAStatusUpdate(BaseModel):
    """Output of Agent 3 (Status Monitor).
    Represents a status change detected on a portal."""

    request_id: str
    mrn: str
    portal: Portal
    status: PAStatusEnum
    determination_date: Optional[str] = None
    denial_reason: Optional[str] = None
    notes: Optional[str] = None
    checked_at: datetime


class AgentRun(BaseModel):
    """Tracks a single agent execution. Created at start, updated on completion."""

    id: Optional[str] = None
    agent_type: AgentType
    mrn: str
    portal: Portal
    started_at: datetime
    completed_at: Optional[datetime] = None
    steps_taken: int = 0
    max_steps: int = 25
    success: Optional[bool] = None
    error_message: Optional[str] = None
    gif_path: Optional[str] = None


class AlertPayload(BaseModel):
    """Payload sent to Agentmail notification service."""

    patient_name: str
    mrn: str
    event_type: Literal["approved", "denied", "delayed", "error", "submitted"]
    portal: Portal
    details: str
    timestamp: datetime


# ──────────────────────────────────────────────────────────────
# API Request / Response Models
# ──────────────────────────────────────────────────────────────

class TriggerEligibilityRequest(BaseModel):
    mrn: str
    portal: Portal = Portal.STEDI


class TriggerPARequest(BaseModel):
    mrn: str
    portal: Portal = Portal.COVERMYMEDS


class TriggerStatusCheckRequest(BaseModel):
    mrn: str
    portal: Optional[Portal] = None  # None = check all portals


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
