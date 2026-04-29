"""Contract compliance tests for IntegrationAdapter."""

from datetime import datetime, timezone

import pytest

from app.adapters.integrations.stub import StubIntegrationAdapter
from app.contracts.agent import IntegrationType
from app.contracts.integration import ActionResult, AuthResult, SyncStatus


@pytest.fixture
def adapter():
    return StubIntegrationAdapter()


@pytest.mark.asyncio
async def test_authenticate_success(adapter):
    result = await adapter.authenticate({"token": "valid"})
    assert isinstance(result, AuthResult)
    assert result.success is True


@pytest.mark.asyncio
async def test_authenticate_failure(adapter):
    result = await adapter.authenticate({"token": "bad"})
    assert result.success is False


@pytest.mark.asyncio
async def test_fetch_data(adapter):
    data = await adapter.fetch_data({})
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_push_action(adapter):
    result = await adapter.push_action({"type": "create"})
    assert isinstance(result, ActionResult)
    assert result.success is True


@pytest.mark.asyncio
async def test_check_for_changes(adapter):
    changes = await adapter.check_for_changes(datetime.now(timezone.utc))
    assert isinstance(changes, list)


def test_get_sync_status(adapter):
    status = adapter.get_sync_status()
    assert isinstance(status, SyncStatus)


def test_get_integration_type(adapter):
    assert adapter.get_integration_type() == IntegrationType.stub
