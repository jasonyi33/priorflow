from pathlib import Path

from tools.minimax_client import MiniMaxClientError
from tools.minimax_extractor import extract_pdf_to_pa_fields
import tools.minimax_extractor as minimax_extractor


def test_extractor_feeds_local_pdf_text_into_minimax(monkeypatch, tmp_path):
    pdf_path = tmp_path / "chart.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n")

    captured: dict[str, str] = {}

    class FakeClient:
        def upload_file(self, _file_path: Path) -> str:
            return "file_abc123"

        def chat_extract_structured(self, raw_text: str):
            captured["raw_text"] = raw_text
            return {"patient": {"first_name": "Jane", "last_name": "Doe"}}

    monkeypatch.setattr(minimax_extractor, "MiniMaxClient", FakeClient)
    monkeypatch.setattr(
        minimax_extractor,
        "_extract_pdf_text_local",
        lambda _file_path: "First Name: Jane\nLast Name: Doe\n",
    )

    extracted = extract_pdf_to_pa_fields(pdf_path)

    assert captured["raw_text"] == "First Name: Jane\nLast Name: Doe\n"
    assert extracted["patient"]["first_name"] == "Jane"
    assert extracted["source"]["minimax_file_id"] == "local_pdf"


def test_extractor_still_uses_local_text_when_upload_fails(monkeypatch, tmp_path):
    pdf_path = tmp_path / "chart.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n")

    captured: dict[str, str] = {}

    class FakeClient:
        def upload_file(self, _file_path: Path) -> str:
            raise MiniMaxClientError("upload failed")

        def chat_extract_structured(self, raw_text: str):
            captured["raw_text"] = raw_text
            return {"patient": {"first_name": "Jane"}}

    monkeypatch.setattr(minimax_extractor, "MiniMaxClient", FakeClient)
    monkeypatch.setattr(
        minimax_extractor,
        "_extract_pdf_text_local",
        lambda _file_path: "First Name: Jane\n",
    )

    extracted = extract_pdf_to_pa_fields(pdf_path)

    assert captured["raw_text"] == "First Name: Jane\n"
    assert extracted["patient"]["first_name"] == "Jane"
    assert extracted["source"]["minimax_file_id"] == "local_pdf"
