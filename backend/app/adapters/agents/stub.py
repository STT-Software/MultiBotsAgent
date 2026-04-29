"""Stub agent for testing."""

from app.contracts.agent import (
    AgentAction, AgentContract, AgentResponse, AgentType, ConversationContext, IntegrationType,
)
from app.contracts.channel import NormalizedMessage


class StubAgent(AgentContract):
    def __init__(self, agent_type: AgentType = AgentType.general_query):
        self._agent_type = agent_type

    def get_agent_type(self) -> AgentType:
        return self._agent_type

    async def process(self, message: NormalizedMessage, context: ConversationContext) -> AgentResponse:
        return AgentResponse(
            response_text=f"Stub response to: {message.content}",
            action=AgentAction.respond,
        )

    def get_required_integrations(self) -> list[IntegrationType]:
        return []
