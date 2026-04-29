"""Unit tests for EventBus."""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.event_bus import EventBus, EventType


@pytest.fixture
def bus():
    b = EventBus()
    b.reset()
    return b


@pytest.mark.asyncio
async def test_subscribe_and_publish(bus):
    handler = AsyncMock()
    bus.subscribe(EventType.message_received, handler)
    with patch.object(bus, "_persist_event", new_callable=AsyncMock):
        await bus.publish(EventType.message_received, {"msg": "hi"})
    handler.assert_called_once_with(EventType.message_received, {"msg": "hi"})


@pytest.mark.asyncio
async def test_failed_handler_does_not_affect_others(bus):
    failing = AsyncMock(side_effect=Exception("boom"))
    success = AsyncMock()
    bus.subscribe(EventType.response_generated, failing)
    bus.subscribe(EventType.response_generated, success)
    with patch.object(bus, "_persist_event", new_callable=AsyncMock):
        await bus.publish(EventType.response_generated, {"data": 1})
    success.assert_called_once()


@pytest.mark.asyncio
async def test_singleton():
    a = EventBus()
    b = EventBus()
    assert a is b
