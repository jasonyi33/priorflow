"""MiniMax REST client for PDF ingestion and structured extraction."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

import httpx

from server.config import settings


class MiniMaxClientError(RuntimeError):
    """Raised when MiniMax API calls fail or return invalid payloads."""


class MiniMaxClient:
    def __init__(self) -> None:
        self.api_key = settings.MINIMAX_API_KEY
        self.base_url = settings.MINIMAX_API_BASE_URL.rstrip("/")
        self.model = settings.MINIMAX_MODEL
        self.file_purpose = settings.MINIMAX_FILE_PURPOSE
        self.group_id = settings.MINIMAX_GROUP_ID
        self.timeout = 30.0

    def upload_file(self, file_path: Path) -> str:
        if not self.api_key:
            raise MiniMaxClientError("MINIMAX_API_KEY is not configured")
        if not file_path.exists():
            raise MiniMaxClientError(f"File does not exist: {file_path}")

        url = f"{self.base_url}/v1/files/upload"
        params = self._query_params()

        for attempt in range(3):
            try:
                with file_path.open("rb") as f:
                    response = httpx.post(
                        url,
                        headers=self._auth_headers(),
                        params=params,
                        data={"purpose": self.file_purpose},
                        files={"file": (file_path.name, f, "application/pdf")},
                        timeout=self.timeout,
                    )
                if response.status_code >= 500 or response.status_code == 429:
                    raise MiniMaxClientError(f"MiniMax upload retryable error: {response.status_code}")
                response.raise_for_status()
                payload = response.json()
                return self._extract_file_id(payload)
            except (httpx.HTTPError, ValueError, MiniMaxClientError) as exc:
                if attempt == 2:
                    raise MiniMaxClientError(f"MiniMax file upload failed: {exc}") from exc
                time.sleep(0.5 * (attempt + 1))

        raise MiniMaxClientError("MiniMax file upload failed")

    def fetch_file_content(self, file_id: str) -> str:
        if not self.api_key:
            raise MiniMaxClientError("MINIMAX_API_KEY is not configured")

        url = f"{self.base_url}/v1/files/{file_id}/content"
        params = self._query_params()

        for attempt in range(3):
            try:
                response = httpx.get(
                    url,
                    headers=self._auth_headers(),
                    params=params,
                    timeout=self.timeout,
                )
                if response.status_code >= 500 or response.status_code == 429:
                    raise MiniMaxClientError(f"MiniMax content retryable error: {response.status_code}")
                response.raise_for_status()
                text = response.text.strip()
                if not text:
                    raw = response.content.decode("utf-8", errors="ignore").strip()
                    text = raw
                if not text:
                    raise MiniMaxClientError("MiniMax file content is empty")
                return text
            except (httpx.HTTPError, MiniMaxClientError) as exc:
                if attempt == 2:
                    raise MiniMaxClientError(f"MiniMax file content retrieval failed: {exc}") from exc
                time.sleep(0.5 * (attempt + 1))

        raise MiniMaxClientError("MiniMax file content retrieval failed")

    def chat_extract_structured(self, raw_text: str) -> dict[str, Any]:
        if not self.api_key:
            raise MiniMaxClientError("MINIMAX_API_KEY is not configured")

        url = f"{self.base_url}/v1/chat/completions"
        params = self._query_params()
        prompt = (
            "Extract prior authorization intake fields from this chart text. "
            "Return JSON only with keys: patient, insurance, diagnosis, medication, provider, "
            "clinical_support, confidence, missing_fields. "
            "Do not fabricate values. Use empty strings or empty arrays for unknown fields."
        )
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": raw_text[:120000]},
            ],
            "temperature": 0.1,
            "max_tokens": 3000,
        }

        for attempt in range(3):
            try:
                response = httpx.post(
                    url,
                    headers={**self._auth_headers(), "Content-Type": "application/json"},
                    params=params,
                    json=payload,
                    timeout=self.timeout,
                )
                if response.status_code >= 500 or response.status_code == 429:
                    raise MiniMaxClientError(f"MiniMax extraction retryable error: {response.status_code}")
                response.raise_for_status()
                data = response.json()
                content = self._extract_content_text(data)
                return self._parse_json_content(content)
            except (httpx.HTTPError, ValueError, MiniMaxClientError) as exc:
                if attempt == 2:
                    raise MiniMaxClientError(f"MiniMax structured extraction failed: {exc}") from exc
                time.sleep(0.5 * (attempt + 1))

        raise MiniMaxClientError("MiniMax structured extraction failed")

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    def _query_params(self) -> dict[str, str]:
        params: dict[str, str] = {}
        if self.group_id:
            params["GroupId"] = self.group_id
        return params

    @staticmethod
    def _extract_file_id(payload: dict[str, Any]) -> str:
        file_id = payload.get("file_id")
        if isinstance(file_id, str) and file_id:
            return file_id

        file_obj = payload.get("file")
        if isinstance(file_obj, dict):
            nested = file_obj.get("id") or file_obj.get("file_id")
            if isinstance(nested, str) and nested:
                return nested

        raise MiniMaxClientError("MiniMax upload response missing file_id")

    @staticmethod
    def _extract_content_text(data: dict[str, Any]) -> str:
        choices = data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise MiniMaxClientError("MiniMax response missing choices")

        message = choices[0].get("message", {})
        content = message.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            joined = "\n".join(parts).strip()
            if joined:
                return joined
        raise MiniMaxClientError("MiniMax response missing message content")

    @staticmethod
    def _parse_json_content(content: str) -> dict[str, Any]:
        direct = content.strip()
        try:
            parsed = json.loads(direct)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        fence_match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL | re.IGNORECASE)
        if fence_match:
            parsed = json.loads(fence_match.group(1))
            if isinstance(parsed, dict):
                return parsed

        brace_match = re.search(r"(\{.*\})", content, re.DOTALL)
        if brace_match:
            parsed = json.loads(brace_match.group(1))
            if isinstance(parsed, dict):
                return parsed

        raise MiniMaxClientError("MiniMax extraction response is not valid JSON")
