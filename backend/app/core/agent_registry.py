"""Agent registry: declarative lookup of agents by intent."""

from app.contracts.agent import AgentCapability, AgentContract, IntentType


class AgentRegistry:
    def __init__(self):
        self._agents: dict[str, tuple[AgentContract, AgentCapability]] = {}
        self._fallback: AgentContract | None = None

    def register_agent(self, agent: AgentContract, capabilities: AgentCapability) -> None:
        key = capabilities.agent_type.value
        self._agents[key] = (agent, capabilities)
        if capabilities.is_fallback:
            self._fallback = agent

    def get_agent_for_intent(self, intent: IntentType, tenant_id: str | None = None) -> AgentContract | None:
        best = None
        best_priority = -1
        for agent, cap in self._agents.values():
            if intent in cap.handled_intents and cap.priority > best_priority:
                best = agent
                best_priority = cap.priority
        return best if best else self._fallback

    def get_fallback_agent(self) -> AgentContract | None:
        return self._fallback
