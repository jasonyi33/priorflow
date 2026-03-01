"""Laminar initialization and shared tracing helpers."""

import logging
import os

try:
    from lmnr import Laminar
    from lmnr.opentelemetry_lib.tracing.instruments import Instruments
except Exception:  # noqa: BLE001
    Laminar = None  # type: ignore[assignment]
    Instruments = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

_initialized = False


def initialize_laminar() -> bool:
    """Initialize Laminar once for this process.

    Uses LMNR_PROJECT_API_KEY (preferred) with LAMINAR_API_KEY fallback.
    """
    global _initialized

    if _initialized:
        return True
    if Laminar is None or Instruments is None:
        logger.info("Laminar SDK not installed; tracing disabled")
        return False
    if Laminar.is_initialized():
        _initialized = True
        return True

    api_key = os.getenv("LMNR_PROJECT_API_KEY") or os.getenv("LAMINAR_API_KEY")
    if not api_key:
        logger.info("Laminar disabled: LMNR_PROJECT_API_KEY not set")
        return False

    base_url = os.getenv("LMNR_BASE_URL")
    environment = os.getenv("ENVIRONMENT", "local")

    kwargs = {
        "project_api_key": api_key,
        "instruments": [
            Instruments.BROWSER_USE,
            Instruments.BROWSER_USE_SESSION,
            Instruments.PLAYWRIGHT,
        ],
        "metadata": {
            "service": "priorflow",
            "environment": environment,
        },
    }
    if base_url:
        kwargs["base_url"] = base_url

    try:
        Laminar.initialize(**kwargs)
        _initialized = True
        logger.info("Laminar initialized")
        return True
    except Exception:  # noqa: BLE001
        logger.warning("Laminar initialization failed; tracing disabled", exc_info=True)
        return False


def shutdown_laminar() -> None:
    """Flush and shut down Laminar exporter for short-lived processes."""
    if Laminar is None or not Laminar.is_initialized():
        return
    try:
        Laminar.flush()
        Laminar.shutdown()
    except Exception:  # noqa: BLE001
        logger.warning("Laminar shutdown failed", exc_info=True)
