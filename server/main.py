"""
PriorFlow Orchestration Server.

FastAPI application that dispatches Browser Use agents and serves data to the frontend.
Owned by Dev 1 (Infrastructure Architect).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import settings
from server.observability import initialize_laminar, shutdown_laminar

initialize_laminar()

from server.routes import patients, eligibility, pa_requests, agents, memory, intake

app = FastAPI(
    title="PriorFlow API",
    description="Prior Authorization Agent Orchestration Server",
    version="0.1.0",
)

_origins = [
    f"http://localhost:{settings.FRONTEND_PORT}",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
]
if settings.FRONTEND_URL:
    _origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(intake.router, prefix="/api/intake", tags=["intake"])
app.include_router(eligibility.router, prefix="/api/eligibility", tags=["eligibility"])
app.include_router(pa_requests.router, prefix="/api/pa", tags=["pa_requests"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(memory.router, prefix="/api/memory", tags=["memory"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "priorflow"}


@app.post("/api/webhooks/agentmail")
async def agentmail_webhook(payload: dict):
    """Receive inbound email events from Agentmail.

    When a payer or CoverMyMeds sends an email to a PA inbox,
    this triggers a status check for the associated MRN.
    """
    import logging
    _logger = logging.getLogger(__name__)
    inbox_username = payload.get("inbox", {}).get("username", "")
    if inbox_username.startswith("pa-"):
        mrn = inbox_username[3:].upper()
        _logger.info("Agentmail webhook: inbound email for %s", mrn)
        try:
            from server.services import orchestrator
            await orchestrator.dispatch_status_check(mrn)
        except Exception:
            _logger.warning("Failed to dispatch status check from webhook", exc_info=True)
    return {"status": "ok"}


@app.on_event("shutdown")
async def on_shutdown():
    shutdown_laminar()
