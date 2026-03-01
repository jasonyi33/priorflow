"""Server configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

# Support per-developer local overrides without touching tracked files.
load_dotenv(".env", override=False)
load_dotenv(".env.local", override=True)


class Settings:
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "3000"))

    # Convex
    CONVEX_URL: str = os.getenv("CONVEX_URL", "")
    CONVEX_DEPLOY_KEY: str = os.getenv("CONVEX_DEPLOY_KEY", "")

    # Browser Use
    BROWSER_USE_API_KEY: str = os.getenv("BROWSER_USE_API_KEY", "")

    # Portal credentials
    CMM_USERNAME: str = os.getenv("CMM_USERNAME", "")
    CMM_PASSWORD: str = os.getenv("CMM_PASSWORD", "")
    STEDI_API_KEY: str = os.getenv("STEDI_API_KEY", "")

    # Flexpa (supplementary FHIR data source)
    FLEXPA_SECRET_KEY: str = os.getenv("FLEXPA_SECRET_KEY", "")

    # Notifications
    AGENTMAIL_API_KEY: str = os.getenv("AGENTMAIL_API_KEY", "")

    # Memory (Supermemory)
    SUPERMEMORY_API_KEY: str = os.getenv("SUPERMEMORY_API_KEY", "")

    # MiniMax intake
    MINIMAX_API_KEY: str = os.getenv("MINIMAX_API_KEY", "")
    MINIMAX_API_BASE_URL: str = os.getenv("MINIMAX_API_BASE_URL", "https://api.minimax.io")
    MINIMAX_MODEL: str = os.getenv("MINIMAX_MODEL", "MiniMax-M2")
    MINIMAX_FILE_PURPOSE: str = os.getenv("MINIMAX_FILE_PURPOSE", "pa_chart_ingestion")
    MINIMAX_GROUP_ID: str = os.getenv("MINIMAX_GROUP_ID", "")

    # Frontend URL (for CORS in production)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")

    # LLM
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Observability
    LMNR_PROJECT_API_KEY: str = os.getenv("LMNR_PROJECT_API_KEY", "")
    LMNR_BASE_URL: str = os.getenv("LMNR_BASE_URL", "")
    # Backward-compatible fallback name.
    LAMINAR_API_KEY: str = os.getenv("LAMINAR_API_KEY", "")


settings = Settings()
