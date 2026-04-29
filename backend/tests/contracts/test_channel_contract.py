"""Contract compliance tests for ChannelAdapter."""

import uuid

import pytest

from app.adapters.channels.stub import StubChannelAdapter
from app.contracts.channel import ChannelType, DeliveryStatus, NormalizedMessage


@pytest.fixture
def adapter():
    return StubChannelAdapter()


@pytest.mark.asyncio
async def test_receive_webhook_returns_normalized_message(adapter):
    payload = {"content": "Hola", "sender_id": "123", "tenant_id": str(uuid.uuid4())}
    msg = await adapter.receive_webhook(payload)
    assert isinstance(msg, NormalizedMessage)
    assert msg.content == "Hola"
    assert msg.sender_id == "123"


@pytest.mark.asyncio
async def test_send_message_returns_delivery_status(adapter):
    result = await adapter.send_message("conv-1", "Hello back")
    assert isinstance(result, DeliveryStatus)
    assert result.success is True
    assert len(adapter.sent_messages) == 1


def test_get_channel_type(adapter):
    assert adapter.get_channel_type() == ChannelType.stub


def test_validate_webhook(adapter):
    assert adapter.validate_webhook({}, "valid-stub-signature") is True
    assert adapter.validate_webhook({}, "bad") is False
