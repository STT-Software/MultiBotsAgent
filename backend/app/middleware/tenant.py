"""Multi-tenant middleware: sets app.current_tenant_id on the DB connection per request."""

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from sqlalchemy import text

from app.config import get_settings

settings = get_settings()

SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/api/v1/auth/login"}


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        # Try to extract tenant info from JWT
        tenant_id = None
        role = "operator"
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = jwt.decode(auth[7:], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
                tenant_id = payload.get("tenant_id")
                role = payload.get("role", "operator")
            except JWTError:
                pass

        request.state.tenant_id = tenant_id
        request.state.role = role
        return await call_next(request)


async def set_tenant_context(session, tenant_id: str | None, role: str = "operator") -> None:
    """Set RLS context on a database session."""
    if role == "consultant":
        await session.execute(text("SET ROLE postgres"))
    elif tenant_id:
        await session.execute(text(f"SET app.current_tenant_id = '{tenant_id}'"))
        await session.execute(text("SET ROLE app_user"))


async def reset_tenant_context(session) -> None:
    """Reset RLS context on a database session."""
    await session.execute(text("RESET ROLE"))
    await session.execute(text("RESET app.current_tenant_id"))
