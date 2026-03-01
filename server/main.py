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

from server.routes import patients, eligibility, pa_requests, agents

app = FastAPI(
    title="PriorFlow API",
    description="Prior Authorization Agent Orchestration Server",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{settings.FRONTEND_PORT}",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(eligibility.router, prefix="/api/eligibility", tags=["eligibility"])
app.include_router(pa_requests.router, prefix="/api/pa", tags=["pa_requests"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "priorflow"}


@app.on_event("shutdown")
async def on_shutdown():
    shutdown_laminar()
