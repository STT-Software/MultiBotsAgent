"""Stub channel adapter for testing."""

import uuid
from datetime import datetime, timezone

from app.contracts.channel import (
    ChannelAdapter, ChannelType, DeliveryStatus, MessageContentType, NormalizedMessage,
)


class StubChannelAdapter(ChannelAdapter):
    def __init__(self):
        self.sent_messages: list[dict] = []

    async def receive_webhook(self, raw_payload: dict) -> NormalizedMessage:
        return NormalizedMessage(
            external_id=raw_payload.get("id", str(uuid.uuid4())),
            channel_type=ChannelType.stub,
            sender_id=raw_payload.get("sender_id", "stub-sender"),
            sender_name=raw_payload.get("sender_name", "Stub User"),
            content=raw_payload.get("content", ""),
            content_type=MessageContentType(raw_payload.get("content_type", "text")),
            timestamp=datetime.now(timezone.utc),
            metadata=raw_payload.get("metadata", {}),
            tenant_id=raw_payload.get("tenant_id", uuid.uuid4()),
        )

    async def send_message(self, conversation_id: str, content: str) -> DeliveryStatus:
        self.sent_messages.append({"conversation_id": conversation_id, "content": content})
        return DeliveryStatus(success=True, external_id=str(uuid.uuid4()))

    def get_channel_type(self) -> ChannelType:
        return ChannelType.stub

    def validate_webhook(self, raw_payload: dict, signature: str) -> bool:
        return signature == "valid-stub-signature"
