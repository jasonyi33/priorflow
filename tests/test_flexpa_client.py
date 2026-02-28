"""
Tests for Flexpa FHIR client — validates _extract_entries helper
and FlexpaClient.enabled property.

Owned by Dev 2. Run: uv run pytest tests/test_flexpa_client.py -v
"""

from tools.flexpa_client import _extract_entries, FlexpaClient


def test_extract_entries_valid_bundle():
    """Valid FHIR Bundle with entries returns resource list."""
    bundle = {
        "resourceType": "Bundle",
        "entry": [
            {"resource": {"resourceType": "Coverage", "id": "1"}},
            {"resource": {"resourceType": "Coverage", "id": "2"}},
        ],
    }
    result = _extract_entries(bundle)
    assert len(result) == 2
    assert result[0]["id"] == "1"
    assert result[1]["id"] == "2"


def test_extract_entries_empty_bundle():
    """Bundle with no entries returns empty list."""
    bundle = {"resourceType": "Bundle", "entry": []}
    assert _extract_entries(bundle) == []


def test_extract_entries_no_entry_key():
    """Bundle missing 'entry' key returns empty list."""
    bundle = {"resourceType": "Bundle"}
    assert _extract_entries(bundle) == []


def test_extract_entries_non_bundle():
    """Non-Bundle resourceType returns empty list."""
    bundle = {"resourceType": "OperationOutcome", "issue": []}
    assert _extract_entries(bundle) == []


def test_extract_entries_none_input():
    """None input returns empty list."""
    assert _extract_entries(None) == []


def test_extract_entries_empty_dict():
    """Empty dict returns empty list."""
    assert _extract_entries({}) == []


def test_extract_entries_skips_entries_without_resource():
    """Entries missing 'resource' key are skipped."""
    bundle = {
        "resourceType": "Bundle",
        "entry": [
            {"resource": {"resourceType": "Coverage", "id": "1"}},
            {"search": {"mode": "match"}},
            {"resource": {"resourceType": "Coverage", "id": "3"}},
        ],
    }
    result = _extract_entries(bundle)
    assert len(result) == 2
    assert result[0]["id"] == "1"
    assert result[1]["id"] == "3"


def test_client_enabled_with_key(monkeypatch):
    """FlexpaClient.enabled returns True when FLEXPA_SECRET_KEY is set."""
    monkeypatch.setenv("FLEXPA_SECRET_KEY", "test-secret-key")
    client = FlexpaClient()
    assert client.enabled is True


def test_client_disabled_without_key(monkeypatch):
    """FlexpaClient.enabled returns False when FLEXPA_SECRET_KEY is empty."""
    monkeypatch.setenv("FLEXPA_SECRET_KEY", "")
    client = FlexpaClient()
    assert client.enabled is False


def test_client_disabled_key_not_set(monkeypatch):
    """FlexpaClient.enabled returns False when FLEXPA_SECRET_KEY is unset."""
    monkeypatch.delenv("FLEXPA_SECRET_KEY", raising=False)
    client = FlexpaClient()
    assert client.enabled is False
