"""Unit tests for ConversationOrchestrator."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.contracts.channel import ChannelType, NormalizedMessage
from app.core.orchestrator import ConversationOrchestrator


@pytest.fixture
def message():
    return NormalizedMessage(
        external_id="1", channel_type=ChannelType.stub, sender_id="user-1",
        content="Hola", timestamp=datetime.now(timezone.utc), tenant_id=uuid.uuid4(),
    )


@pytest.fixture
def orchestrator():
    return ConversationOrchestrator()


@pytest.mark.asyncio
async def test_handle_message_new_conversation(orchestrator, message):
    mock_session = AsyncMock()
    # No existing conversation
    mock_result = MagicMock()
    mock_result.first.return_value = None
    # Session state query
    mock_state_result = MagicMock()
    mock_state_result.first.return_value = ("agent_active",)
    mock_session.execute = AsyncMock(side_effect=[mock_result, AsyncMock(), AsyncMock(), AsyncMock(), mock_state_result])
    mock_session.commit = AsyncMock()

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.orchestrator.get_session_factory", return_value=mock_factory):
        with patch("app.core.orchestrator.event_bus.publish", new_callable=AsyncMock):
            result = await orchestrator.handle_message(message)

    assert "Hola" in result
