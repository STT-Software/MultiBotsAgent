"""Simple in-memory rate limiter: 100 requests/minute per tenant."""

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

MAX_REQUESTS = 100
WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        tenant_id = getattr(request.state, "tenant_id", None) if hasattr(request, "state") else None
        key = tenant_id or request.client.host if request.client else "unknown"

        now = time.time()
        window_start = now - WINDOW_SECONDS
        self._requests[key] = [t for t in self._requests[key] if t > window_start]

        if len(self._requests[key]) >= MAX_REQUESTS:
            return JSONResponse({"data": None, "error": {"code": "rate_limited", "message": "Too many requests"}}, status_code=429)

        self._requests[key].append(now)
        return await call_next(request)
