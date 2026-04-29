"""Agent contract, models, and enums."""

from abc import ABC, abstractmethod
from enum import Enum
from uuid import UUID

from pydantic import BaseModel

from app.contracts.channel import NormalizedMessage


class AgentType(str, Enum):
    general_query = "general_query"
    scheduling = "scheduling"
    quoting = "quoting"
    custom = "custom"


class AgentAction(str, Enum):
    respond = "respond"
    transfer = "transfer"
    escalate = "escalate"
    execute_action = "execute_action"


class SessionState(str, Enum):
    agent_active = "agent_active"
    escalated = "escalated"
    human_active = "human_active"
    closed = "closed"


class IntentType(str, Enum):
    general_query = "general_query"
    scheduling = "scheduling"
    quoting = "quoting"
    purchase_intent = "purchase_intent"
    complaint = "complaint"
    escalation_request = "escalation_request"
    greeting = "greeting"
    farewell = "farewell"
    unknown = "unknown"


class IntegrationType(str, Enum):
    google_calendar = "google_calendar"
    google_drive = "google_drive"
    notion = "notion"
    confluence = "confluence"
    custom_api = "custom_api"
    manual_upload = "manual_upload"
    stub = "stub"


class ConversationContext(BaseModel):
    conversation_id: UUID
    tenant_id: UUID
    session_state: SessionState = SessionState.agent_active
    message_history: list = []
    current_intent: IntentType | None = None
    shared_context: dict = {}
    active_agent: AgentType = AgentType.general_query


class AgentResponse(BaseModel):
    response_text: str
    action: AgentAction = AgentAction.respond
    transfer_to: AgentType | None = None
    escalation_reason: str | None = None
    context_update: dict = {}


class AgentCapability(BaseModel):
    agent_type: AgentType
    handled_intents: list[IntentType]
    priority: int = 0
    requires_integrations: list[IntegrationType] = []
    is_fallback: bool = False


class AgentContract(ABC):
    @abstractmethod
    def get_agent_type(self) -> AgentType: ...

    @abstractmethod
    async def process(self, message: NormalizedMessage, context: ConversationContext) -> AgentResponse: ...

    @abstractmethod
    def get_required_integrations(self) -> list[IntegrationType]: ...
