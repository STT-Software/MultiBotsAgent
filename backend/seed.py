"""Seed script: creates 1 tenant + 1 consultant user."""

import asyncio
import uuid

import bcrypt
from sqlalchemy import text

from app.database import async_session, engine


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def seed():
    async with async_session() as session:
        result = await session.execute(text("SELECT count(*) FROM tenants"))
        if result.scalar() > 0:
            print("Database already seeded, skipping.")
            return

        tenant_id = uuid.uuid4()

        await session.execute(
            text("INSERT INTO tenants (id, name, slug, config, is_active) VALUES (:id, :name, :slug, :config, true)"),
            {"id": tenant_id, "name": "Demo PYME", "slug": "demo-pyme", "config": "{}"},
        )

        await session.execute(
            text(
                "INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, is_active)"
                " VALUES (:id, :tenant_id, :email, :hashed_password, :full_name, :role, true)"
            ),
            {
                "id": uuid.uuid4(),
                "tenant_id": tenant_id,
                "email": "consultant@multiboots.dev",
                "hashed_password": hash_password("changeme123"),
                "full_name": "Consultant User",
                "role": "consultant",
            },
        )

        await session.commit()
        print(f"Seeded: tenant '{tenant_id}' + consultant user 'consultant@multiboots.dev'")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
