"""Stub integration adapter for testing."""

from datetime import datetime, timezone

from app.contracts.agent import IntegrationType
from app.contracts.integration import (
    ActionResult, AuthResult, ChangeEvent, IntegrationAdapter, IntegrationDataItem, SyncStatus,
)


class StubIntegrationAdapter(IntegrationAdapter):
    def __init__(self):
        self._items: list[IntegrationDataItem] = []
        self._authenticated = False

    def get_integration_type(self) -> IntegrationType:
        return IntegrationType.stub

    async def authenticate(self, credentials: dict) -> AuthResult:
        self._authenticated = credentials.get("token") == "valid"
        return AuthResult(success=self._authenticated, error=None if self._authenticated else "Invalid token")

    async def fetch_data(self, query: dict) -> list[IntegrationDataItem]:
        return self._items

    async def push_action(self, action: dict) -> ActionResult:
        return ActionResult(success=True, external_id="stub-action-1")

    async def check_for_changes(self, since: datetime) -> list[ChangeEvent]:
        return []

    def get_sync_status(self) -> SyncStatus:
        return SyncStatus(last_sync=datetime.now(timezone.utc), status="synced", items_synced=len(self._items))
