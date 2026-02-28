"""Server configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


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

    # LLM
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Observability
    LAMINAR_API_KEY: str = os.getenv("LAMINAR_API_KEY", "")


settings = Settings()
