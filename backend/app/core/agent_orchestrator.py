"""Agent orchestrator: classifies intent, routes to agent, handles transfers."""

from app.contracts.agent import AgentAction, AgentResponse, AgentType, ConversationContext, IntentType
from app.contracts.channel import NormalizedMessage
from app.core.agent_registry import AgentRegistry
from app.core.intent_classifier import IntentClassification, IntentClassifier, RuleBasedClassifier

DEFAULT_CONFIDENCE_THRESHOLD = 0.3
MAX_TRANSFERS = 3


class AgentOrchestrator:
    def __init__(self, registry: AgentRegistry, classifier: IntentClassifier | None = None):
        self.registry = registry
        self.classifier = classifier or RuleBasedClassifier()

    async def route_message(self, message: NormalizedMessage, context: ConversationContext) -> AgentResponse:
        classification = self.classifier.classify(message.content)

        # Low confidence → fallback
        if classification.confidence < DEFAULT_CONFIDENCE_THRESHOLD:
            agent = self.registry.get_fallback_agent()
        else:
            agent = self.registry.get_agent_for_intent(classification.intent_type)

        if agent is None:
            return AgentResponse(response_text="No hay agente disponible.", action=AgentAction.escalate, escalation_reason="No agent found")

        # Process with transfer handling
        transfers = 0
        current_agent = agent
        while transfers <= MAX_TRANSFERS:
            response = await current_agent.process(message, context)

            if response.action != AgentAction.transfer:
                return response

            transfers += 1
            if transfers > MAX_TRANSFERS:
                return AgentResponse(
                    response_text="Transfiriendo a un agente humano.",
                    action=AgentAction.escalate,
                    escalation_reason="Transfer limit exceeded",
                )

            # Find transfer target
            next_agent = self.registry.get_agent_for_intent(
                IntentType(response.transfer_to.value) if response.transfer_to else IntentType.general_query
            )
            if next_agent is None:
                next_agent = self.registry.get_fallback_agent()
            if next_agent is None:
                return response
            current_agent = next_agent
            context.shared_context.update(response.context_update)

        return AgentResponse(response_text="Error de routing.", action=AgentAction.escalate)
