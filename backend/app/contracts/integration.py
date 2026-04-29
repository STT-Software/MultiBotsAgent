"""Integration adapter contract and models."""

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.contracts.agent import IntegrationType


class ChangeType(str, Enum):
    created = "created"
    updated = "updated"
    deleted = "deleted"


class AuthResult(BaseModel):
    success: bool
    error: str | None = None


class ActionResult(BaseModel):
    success: bool
    external_id: str | None = None
    error: str | None = None


class SyncStatus(BaseModel):
    last_sync: datetime | None = None
    status: str = "pending"
    items_synced: int = 0


class IntegrationDataItem(BaseModel):
    external_id: str
    source: IntegrationType
    content: str | dict
    content_type: str = "text"
    last_modified: datetime
    metadata: dict = {}


class ChangeEvent(BaseModel):
    external_id: str
    change_type: ChangeType
    timestamp: datetime
    data: IntegrationDataItem | None = None


class IntegrationAdapter(ABC):
    @abstractmethod
    def get_integration_type(self) -> IntegrationType: ...

    @abstractmethod
    async def authenticate(self, credentials: dict) -> AuthResult: ...

    @abstractmethod
    async def fetch_data(self, query: dict) -> list[IntegrationDataItem]: ...

    @abstractmethod
    async def push_action(self, action: dict) -> ActionResult: ...

    @abstractmethod
    async def check_for_changes(self, since: datetime) -> list[ChangeEvent]: ...

    @abstractmethod
    def get_sync_status(self) -> SyncStatus: ...
