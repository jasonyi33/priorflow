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
        self.base_url = settings.CONVEX_URL
        self.deploy_key = settings.CONVEX_DEPLOY_KEY

    async def query(self, function_name: str, args: Optional[dict] = None) -> Any:
        """Run a Convex query function.

        TODO: Dev 1 — Implement in Phase 1:
        POST {CONVEX_URL}/api/query
        Headers: Authorization: Convex {DEPLOY_KEY}
        Body: {"path": function_name, "args": args or {}}
        """
        raise NotImplementedError("Convex query not yet implemented")

    async def mutation(self, function_name: str, args: Optional[dict] = None) -> Any:
        """Run a Convex mutation function.

        TODO: Dev 1 — Implement in Phase 1:
        POST {CONVEX_URL}/api/mutation
        Headers: Authorization: Convex {DEPLOY_KEY}
        Body: {"path": function_name, "args": args or {}}
        """
        raise NotImplementedError("Convex mutation not yet implemented")


convex_client = ConvexClient()
