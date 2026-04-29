"""In-process async event bus with persistence."""

import logging
from collections import defaultdict
from collections.abc import Callable
from enum import Enum

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    message_received = "message_received"
    response_generated = "response_generated"
    escalation_detected = "escalation_detected"
    appointment_created = "appointment_created"
    quote_generated = "quote_generated"
    knowledge_updated = "knowledge_updated"
    conversation_closed = "conversation_closed"
    human_response_sent = "human_response_sent"
    integration_sync_completed = "integration_sync_completed"
    integration_sync_failed = "integration_sync_failed"


class EventBus:
    _instance: "EventBus | None" = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._handlers = defaultdict(list)
        return cls._instance

    def subscribe(self, event_type: EventType, handler: Callable) -> None:
        self._handlers[event_type].append(handler)

    async def publish(self, event_type: EventType, payload: dict, tenant_id: str | None = None) -> None:
        # Persist event
        await self._persist_event(event_type, payload, tenant_id)
        # Execute handlers (isolated — one failure doesn't stop others)
        for handler in self._handlers[event_type]:
            try:
                await handler(event_type, payload)
            except Exception as e:
                logger.error(f"Event handler failed for {event_type}: {e}")

    async def _persist_event(self, event_type: EventType, payload: dict, tenant_id: str | None) -> None:
        try:
            from app.database import get_session_factory
            from sqlalchemy import text
            import uuid

            async with get_session_factory()() as session:
                await session.execute(
                    text(
                        "INSERT INTO events_log (id, tenant_id, event_type, payload)"
                        " VALUES (:id, :tid, :etype, :payload)"
                    ),
                    {"id": str(uuid.uuid4()), "tid": tenant_id, "etype": event_type.value, "payload": str(payload)},
                )
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to persist event {event_type}: {e}")

    def reset(self) -> None:
        """For testing: clear all handlers."""
        self._handlers = defaultdict(list)


# Module-level singleton
event_bus = EventBus()
