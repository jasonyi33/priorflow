"""
Shared agent utilities.

Common configuration, logging wrapper, and helper functions
used by all three agents. Owned by Dev 1.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "charts"
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_chart(mrn: str) -> dict:
    """Load a patient chart from the data/charts directory."""
    chart_file = DATA_DIR / f"{mrn}.json"
    if not chart_file.exists():
        raise FileNotFoundError(f"Chart not found: {chart_file}")
    with open(chart_file) as f:
        return json.load(f)


def save_output(filename: str, data: dict) -> Path:
    """Save agent output to the output directory."""
    output_file = OUTPUT_DIR / filename
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2, default=str)
    return output_file


def get_browser_config() -> dict:
    """Get common browser configuration for agents."""
    return {
        "headless": os.getenv("BROWSER_HEADLESS", "false").lower() == "true",
    }


def get_sensitive_data() -> dict:
    """Get portal credentials as sensitive data dict for Browser Use agents."""
    return {
        "cmm_username": os.getenv("CMM_USERNAME", ""),
        "cmm_password": os.getenv("CMM_PASSWORD", ""),
        "stedi_email": os.getenv("STEDI_EMAIL", ""),
        "stedi_password": os.getenv("STEDI_PASSWORD", ""),
    }
