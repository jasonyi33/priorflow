import pytest

from tools.minimax_client import MiniMaxClient, MiniMaxClientError


def test_extract_file_id_from_nested_numeric_field():
    payload = {
        "file": {
            "file_id": 1700469398,
            "filename": "chart.pdf",
        },
        "base_resp": {"status_code": 0, "status_msg": "success"},
    }

    assert MiniMaxClient._extract_file_id(payload) == "1700469398"


def test_extract_file_id_missing_raises_error():
    with pytest.raises(MiniMaxClientError, match="missing file_id"):
        MiniMaxClient._extract_file_id({"file": {"filename": "chart.pdf"}})


def test_base_resp_error_is_surfaceable():
    payload = {
        "file": None,
        "base_resp": {
            "status_code": 2013,
            "status_msg": "invalid params, invalid file purpose",
        },
    }

    with pytest.raises(MiniMaxClientError, match="2013"):
        MiniMaxClient._raise_for_base_resp_error(payload)
