import pytest

import app.database as db_module


@pytest.fixture(autouse=True)
async def reset_db_engine():
    """Reset the global engine between tests to avoid event loop conflicts."""
    db_module._engine = None
    db_module._session_factory = None
    yield
    if db_module._engine is not None:
        await db_module._engine.dispose()
    db_module._engine = None
    db_module._session_factory = None
