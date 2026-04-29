"""Conversation orchestrator: manages conversation lifecycle and routing."""

import uuid

from sqlalchemy import text

from app.contracts.agent import SessionState
from app.contracts.channel import NormalizedMessage
from app.core.event_bus import EventType, event_bus
from app.database import get_session_factory


class ConversationOrchestrator:
    async def handle_message(self, message: NormalizedMessage) -> str:
        session_factory = get_session_factory()
        async with session_factory() as db:
            # Find or create conversation
            result = await db.execute(
                text("SELECT id FROM conversations WHERE external_sender_id = :sid AND tenant_id = :tid ORDER BY created_at DESC LIMIT 1"),
                {"sid": message.sender_id, "tid": str(message.tenant_id)},
            )
            row = result.first()

            if row:
                conv_id = str(row[0])
            else:
                conv_id = str(uuid.uuid4())
                await db.execute(
                    text("INSERT INTO conversations (id, tenant_id, external_sender_id, sender_name, channel_type) VALUES (:id, :tid, :sid, :name, :ch)"),
                    {"id": conv_id, "tid": str(message.tenant_id), "sid": message.sender_id, "name": message.sender_name, "ch": message.channel_type.value},
                )
                await db.execute(
                    text("INSERT INTO sessions (id, tenant_id, conversation_id, state) VALUES (:id, :tid, :cid, :state)"),
                    {"id": str(uuid.uuid4()), "tid": str(message.tenant_id), "cid": conv_id, "state": SessionState.agent_active.value},
                )

            # Persist inbound message
            await db.execute(
                text("INSERT INTO messages (id, tenant_id, conversation_id, direction, author_type, content, content_type) VALUES (:id, :tid, :cid, 'inbound', 'client', :content, :ctype)"),
                {"id": str(uuid.uuid4()), "tid": str(message.tenant_id), "cid": conv_id, "content": message.content, "ctype": message.content_type.value},
            )

            # Get session state
            result = await db.execute(
                text("SELECT state FROM sessions WHERE conversation_id = :cid ORDER BY created_at DESC LIMIT 1"),
                {"cid": conv_id},
            )
            state_row = result.first()
            state = state_row[0] if state_row else SessionState.agent_active.value

            await db.commit()

        await event_bus.publish(EventType.message_received, {"conversation_id": conv_id, "content": message.content}, str(message.tenant_id))

        # Route based on state
        if state == SessionState.human_active.value:
            return "Mensaje enviado al operador humano."
        elif state == SessionState.escalated.value:
            return "Un agente humano te atenderá pronto."
        else:
            # Delegate to agent orchestrator (stub for now)
            response_text = f"Recibido: {message.content}"
            await event_bus.publish(EventType.response_generated, {"conversation_id": conv_id, "response": response_text}, str(message.tenant_id))
            return response_text
