"""Tests for AgentOrchestrator."""

import uuid
from datetime import datetime, timezone

import pytest

from app.adapters.agents.stub import StubAgent
from app.contracts.agent import (
    AgentAction, AgentCapability, AgentResponse, AgentType, ConversationContext, IntentType,
)
from app.contracts.channel import ChannelType, NormalizedMessage
from app.core.agent_orchestrator import AgentOrchestrator
from app.core.agent_registry import AgentRegistry


@pytest.fixture
def registry():
    r = AgentRegistry()
    r.register_agent(
        StubAgent(),
        AgentCapability(agent_type=AgentType.general_query, handled_intents=[IntentType.general_query, IntentType.greeting], priority=1, is_fallback=True),
    )
    return r


@pytest.fixture
def orchestrator(registry):
    return AgentOrchestrator(registry)


@pytest.fixture
def message():
    return NormalizedMessage(
        external_id="1", channel_type=ChannelType.stub, sender_id="u1",
        content="Hola", timestamp=datetime.now(timezone.utc), tenant_id=uuid.uuid4(),
    )


@pytest.fixture
def context():
    return ConversationContext(conversation_id=uuid.uuid4(), tenant_id=uuid.uuid4())


@pytest.mark.asyncio
async def test_routes_to_correct_agent(orchestrator, message, context):
    resp = await orchestrator.route_message(message, context)
    assert isinstance(resp, AgentResponse)
    assert resp.action == AgentAction.respond


@pytest.mark.asyncio
async def test_fallback_on_unknown_intent(orchestrator, context):
    msg = NormalizedMessage(
        external_id="2", channel_type=ChannelType.stub, sender_id="u1",
        content="xyz random", timestamp=datetime.now(timezone.utc), tenant_id=uuid.uuid4(),
    )
    resp = await orchestrator.route_message(msg, context)
    assert resp.action == AgentAction.respond  # fallback handles it
