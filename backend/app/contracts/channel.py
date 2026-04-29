"""Channel adapter contract and models."""

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class ChannelType(str, Enum):
    whatsapp = "whatsapp"
    instagram = "instagram"
    telegram = "telegram"
    webchat = "webchat"
    stub = "stub"


class MessageContentType(str, Enum):
    text = "text"
    image = "image"
    audio = "audio"
    document = "document"
    location = "location"
    unknown = "unknown"


class NormalizedMessage(BaseModel):
    external_id: str
    channel_type: ChannelType
    sender_id: str
    sender_name: str = ""
    content: str
    content_type: MessageContentType = MessageContentType.text
    timestamp: datetime
    metadata: dict = {}
    tenant_id: UUID


class DeliveryStatus(BaseModel):
    success: bool
    external_id: str | None = None
    error: str | None = None


class ChannelAdapter(ABC):
    @abstractmethod
    async def receive_webhook(self, raw_payload: dict) -> NormalizedMessage: ...

    @abstractmethod
    async def send_message(self, conversation_id: str, content: str) -> DeliveryStatus: ...

    @abstractmethod
    def get_channel_type(self) -> ChannelType: ...

    @abstractmethod
    def validate_webhook(self, raw_payload: dict, signature: str) -> bool: ...
