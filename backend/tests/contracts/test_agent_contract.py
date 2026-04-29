"""Contract compliance tests for AgentContract and AgentRegistry."""

import uuid
from datetime import datetime, timezone

import pytest

from app.adapters.agents.stub import StubAgent
from app.contracts.agent import (
    AgentCapability, AgentResponse, AgentType, ConversationContext, IntentType, SessionState,
)
from app.contracts.channel import ChannelType, NormalizedMessage
from app.core.agent_registry import AgentRegistry


@pytest.fixture
def message():
    return NormalizedMessage(
        external_id="1", channel_type=ChannelType.stub, sender_id="s1",
        content="Hola", timestamp=datetime.now(timezone.utc), tenant_id=uuid.uuid4(),
    )


@pytest.fixture
def context():
    return ConversationContext(conversation_id=uuid.uuid4(), tenant_id=uuid.uuid4())


@pytest.mark.asyncio
async def test_stub_agent_process(message, context):
    agent = StubAgent()
    resp = await agent.process(message, context)
    assert isinstance(resp, AgentResponse)
    assert "Hola" in resp.response_text


def test_stub_agent_type():
    assert StubAgent().get_agent_type() == AgentType.general_query


def test_registry_lookup():
    registry = AgentRegistry()
    agent = StubAgent()
    cap = AgentCapability(
        agent_type=AgentType.general_query,
        handled_intents=[IntentType.general_query, IntentType.greeting],
        priority=1, is_fallback=True,
    )
    registry.register_agent(agent, cap)
    found = registry.get_agent_for_intent(IntentType.general_query)
    assert found is agent


def test_registry_fallback():
    registry = AgentRegistry()
    agent = StubAgent()
    cap = AgentCapability(
        agent_type=AgentType.general_query, handled_intents=[IntentType.general_query],
        priority=1, is_fallback=True,
    )
    registry.register_agent(agent, cap)
    found = registry.get_agent_for_intent(IntentType.scheduling)
    assert found is agent  # fallback
