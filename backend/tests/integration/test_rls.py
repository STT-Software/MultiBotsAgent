"""Integration tests for multi-tenant RLS isolation."""

import os
import uuid

os.environ["DATABASE_URL"] = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/multiboots"
)

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.middleware.tenant import reset_tenant_context, set_tenant_context

TENANT_A_ID = str(uuid.uuid4())
TENANT_B_ID = str(uuid.uuid4())


@pytest.fixture
async def engine():
    eng = create_async_engine(get_settings().DATABASE_URL)
    # Setup: insert test data as superuser
    async with eng.begin() as conn:
        await conn.execute(
            text("INSERT INTO tenants (id, name, slug, is_active) VALUES (:id, 'Tenant A', :slug, true)"),
            {"id": TENANT_A_ID, "slug": f"ta-{TENANT_A_ID[:8]}"},
        )
        await conn.execute(
            text("INSERT INTO tenants (id, name, slug, is_active) VALUES (:id, 'Tenant B', :slug, true)"),
            {"id": TENANT_B_ID, "slug": f"tb-{TENANT_B_ID[:8]}"},
        )
        await conn.execute(
            text("INSERT INTO agents (id, tenant_id, agent_type, name, is_active) VALUES (:id, :tid, 'general_query', 'Agent A', true)"),
            {"id": str(uuid.uuid4()), "tid": TENANT_A_ID},
        )
        await conn.execute(
            text("INSERT INTO agents (id, tenant_id, agent_type, name, is_active) VALUES (:id, :tid, 'scheduling', 'Agent B', true)"),
            {"id": str(uuid.uuid4()), "tid": TENANT_B_ID},
        )

    yield eng

    # Teardown
    async with eng.begin() as conn:
        await conn.execute(text(f"DELETE FROM agents WHERE tenant_id IN ('{TENANT_A_ID}', '{TENANT_B_ID}')"))
        await conn.execute(text(f"DELETE FROM tenants WHERE id IN ('{TENANT_A_ID}', '{TENANT_B_ID}')"))
    await eng.dispose()


@pytest.mark.asyncio
async def test_tenant_a_only_sees_own_data(engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await set_tenant_context(session, TENANT_A_ID, role="operator")
        result = await session.execute(text("SELECT name FROM agents"))
        names = [r[0] for r in result.fetchall()]
        await reset_tenant_context(session)

    assert "Agent A" in names
    assert "Agent B" not in names


@pytest.mark.asyncio
async def test_tenant_b_only_sees_own_data(engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await set_tenant_context(session, TENANT_B_ID, role="operator")
        result = await session.execute(text("SELECT name FROM agents"))
        names = [r[0] for r in result.fetchall()]
        await reset_tenant_context(session)

    assert "Agent B" in names
    assert "Agent A" not in names


@pytest.mark.asyncio
async def test_consultant_sees_all_tenants(engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await set_tenant_context(session, None, role="consultant")
        result = await session.execute(text("SELECT name FROM agents"))
        names = [r[0] for r in result.fetchall()]
        await reset_tenant_context(session)

    assert "Agent A" in names
    assert "Agent B" in names


@pytest.mark.asyncio
async def test_session_cleanup_between_requests(engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await set_tenant_context(session, TENANT_A_ID, role="operator")
        result = await session.execute(text("SELECT count(*) FROM agents"))
        count_a = result.scalar()
        await reset_tenant_context(session)

        await set_tenant_context(session, TENANT_B_ID, role="operator")
        result = await session.execute(text("SELECT count(*) FROM agents"))
        count_b = result.scalar()
        await reset_tenant_context(session)

    assert count_a == 1
    assert count_b == 1
