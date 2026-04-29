"""Tests for JWT authentication and role-based access control."""

import os
import uuid
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/multiboots"
)

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.core.security import hash_password
from app.main import app

settings = get_settings()
TENANT_ID = str(uuid.uuid4())
USER_ID = str(uuid.uuid4())
USER_EMAIL = f"test-{USER_ID[:8]}@test.com"
USER_PASSWORD = "testpass123"


@pytest.fixture(autouse=True)
async def seed_user():
    engine = create_async_engine(settings.DATABASE_URL, pool_size=1, max_overflow=0)
    async with engine.begin() as conn:
        await conn.execute(
            text("INSERT INTO tenants (id, name, slug, is_active) VALUES (:id, 'Test', :slug, true) ON CONFLICT DO NOTHING"),
            {"id": TENANT_ID, "slug": f"test-{TENANT_ID[:8]}"},
        )
        await conn.execute(
            text(
                "INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, is_active)"
                " VALUES (:id, :tid, :email, :pw, 'Test User', 'admin', true) ON CONFLICT DO NOTHING"
            ),
            {"id": USER_ID, "tid": TENANT_ID, "email": USER_EMAIL, "pw": hash_password(USER_PASSWORD)},
        )
    yield
    async with engine.begin() as conn:
        await conn.execute(text(f"DELETE FROM users WHERE id = '{USER_ID}'"))
        await conn.execute(text(f"DELETE FROM tenants WHERE id = '{TENANT_ID}'"))
    await engine.dispose()


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_login_success(client):
    resp = await client.post("/api/v1/auth/login", json={"email": USER_EMAIL, "password": USER_PASSWORD})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    payload = jwt.decode(data["access_token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == USER_ID
    assert payload["tenant_id"] == TENANT_ID
    assert payload["role"] == "admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    resp = await client.post("/api/v1/auth/login", json={"email": USER_EMAIL, "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post("/api/v1/auth/login", json={"email": "nobody@test.com", "password": "x"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_no_token(client):
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_invalid_token(client):
    resp = await client.post("/api/v1/auth/refresh", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_expired_token(client):
    expired_payload = {
        "sub": USER_ID,
        "tenant_id": TENANT_ID,
        "role": "admin",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    resp = await client.post("/api/v1/auth/refresh", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_success(client):
    resp = await client.post("/api/v1/auth/login", json={"email": USER_EMAIL, "password": USER_PASSWORD})
    token = resp.json()["access_token"]
    resp = await client.post("/api/v1/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_health_no_auth_required(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
