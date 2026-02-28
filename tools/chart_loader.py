"""
Chart loader tool — loads mock EMR data for Browser Use agents.

Owned by Dev 2.
"""

import json
from pathlib import Path

from shared.models import PatientChart

DATA_DIR = Path(__file__).parent.parent / "data" / "charts"


def load_chart(mrn: str) -> PatientChart:
    """Load and validate a patient chart from data/charts/.

    Returns a validated PatientChart Pydantic model.
    Raises FileNotFoundError if chart doesn't exist.
    """
    chart_file = DATA_DIR / f"{mrn}.json"
    if not chart_file.exists():
        raise FileNotFoundError(f"Chart not found for MRN: {mrn}")
    with open(chart_file) as f:
        data = json.load(f)
    return PatientChart(**data)


def load_chart_raw(mrn: str) -> dict:
    """Load a patient chart as raw dict (for agent consumption)."""
    chart_file = DATA_DIR / f"{mrn}.json"
    if not chart_file.exists():
        raise FileNotFoundError(f"Chart not found for MRN: {mrn}")
    with open(chart_file) as f:
        return json.load(f)


def list_available_charts() -> list[str]:
    """List all available MRNs in the data/charts directory."""
    return sorted([
        f.stem for f in DATA_DIR.glob("MRN-*.json")
    ])
