"""enable RLS on tenant-scoped tables

Revision ID: a1b2c3d4e5f6
Revises: 97031796e2c6
Create Date: 2026-04-29 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "97031796e2c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_SCOPED_TABLES = [
    "users",
    "conversations",
    "messages",
    "sessions",
    "agents",
    "knowledge_items",
    "integrations",
    "channel_connections",
    "events_log",
]


def upgrade() -> None:
    # Create app_user role (used by the application, subject to RLS)
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user; END IF; END $$;")
    op.execute("GRANT USAGE ON SCHEMA public TO app_user;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;")
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;")

    for table in TENANT_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            f"USING (tenant_id::text = current_setting('app.current_tenant_id', true));"
        )


def downgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;")
    op.execute("DROP ROLE IF EXISTS app_user;")
