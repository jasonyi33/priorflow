"""
Convex HTTP API client for Python.

Agents and the server use this to read/write to Convex.
Wraps the Convex HTTP API so agents don't need direct Convex SDK access.

Owned by Dev 1. Skeleton for Phase 1 implementation.
"""

import httpx
from typing import Any, Optional

from server.config import settings


class ConvexClient:
    """Thin wrapper around the Convex HTTP API."""

    def __init__(self):
        self.base_url = settings.CONVEX_URL.rstrip("/")
        self.deploy_key = settings.CONVEX_DEPLOY_KEY

    @property
    def enabled(self) -> bool:
        return bool(self.base_url and self.deploy_key)

    async def query(self, function_name: str, args: Optional[dict] = None) -> Any:
        """Run a Convex query function.

        Raises if Convex is not configured or the request fails.
        """
        return await self._post("/api/query", function_name, args)

    async def mutation(self, function_name: str, args: Optional[dict] = None) -> Any:
        """Run a Convex mutation function.

        Raises if Convex is not configured or the request fails.
        """
        return await self._post("/api/mutation", function_name, args)

    async def _post(self, path: str, function_name: str, args: Optional[dict]) -> Any:
        if not self.enabled:
            raise RuntimeError("Convex not configured")

        payload = {"path": function_name, "args": args or {}}
        headers = {"Authorization": f"Convex {self.deploy_key}"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(f"{self.base_url}{path}", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "error":
                raise RuntimeError(data.get("errorMessage", "Convex request failed"))
            # Convex returns {"value": ...}
            return data.get("value", data)


convex_client = ConvexClient()
