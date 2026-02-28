"""
Test configuration and shared fixtures.
Owned by Dev 1.
"""

import json
import pytest
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


@pytest.fixture
def sample_chart():
    """Load the Humira PA sample chart."""
    with open(DATA_DIR / "charts" / "MRN-00421.json") as f:
        return json.load(f)


@pytest.fixture
def sample_eligibility():
    """Load the sample eligibility result fixture."""
    with open(DATA_DIR / "fixtures" / "eligibility_sample.json") as f:
        return json.load(f)


@pytest.fixture
def sample_pa_submission():
    """Load the sample PA submission fixture."""
    with open(DATA_DIR / "fixtures" / "pa_submission_sample.json") as f:
        return json.load(f)
