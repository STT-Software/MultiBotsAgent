# AGENTS.md

## Project Overview

MultiBootsAgent — Plataforma Omnicanal IA para PYMES. Sistema multiagente con orquestador centralizado, multi-tenant (RLS), bus de eventos in-process, y abstracciones de canal/agente/integración.

## Tech Stack

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL 15
- **Frontend:** Next.js 14 + React 18 + TypeScript (pnpm)
- **Infra:** Docker Compose (db, backend, frontend)
- **Linter:** Ruff
- **Tests:** Pytest + pytest-asyncio

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point + /health
│   │   ├── config.py            # Settings (pydantic-settings, reads .env)
│   │   ├── database.py          # Async SQLAlchemy engine + session
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── api/v1/              # FastAPI routers
│   │   ├── core/                # Orchestrators, event bus, security
│   │   ├── contracts/           # Abstract interfaces (channel, agent, integration)
│   │   ├── adapters/            # Implementations of contracts
│   │   │   ├── channels/        # WhatsApp, stub
│   │   │   ├── agents/          # Query, scheduling, quoting, stub
│   │   │   └── integrations/    # Google Calendar, Drive, Notion, stub
│   │   └── middleware/          # Multi-tenant (RLS), rate limiting
│   ├── migrations/              # Alembic migrations
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── contracts/           # Contract compliance tests
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/app/                 # Next.js App Router (layout, pages)
│   ├── package.json
│   ├── next.config.mjs
│   ├── Dockerfile
│   └── .env.example
├── Docs/                        # Initiative and solution documents
├── docker-compose.yml
└── .gitignore
```

## Commands

### Run everything (Docker)

```bash
docker compose up --build
```

Services:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Health: http://localhost:8000/health
- PostgreSQL: localhost:5432 (user: postgres, pass: postgres, db: multiboots)

### Backend (local dev)

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

### Frontend (local dev)

```bash
cd frontend
pnpm install
pnpm dev
```

### Lint

```bash
cd backend
ruff check .
```

### Tests

```bash
cd backend
pytest
```

## Environment Variables

### Backend (`backend/.env`)

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/multiboots
APP_NAME=MultiBootsAgent
APP_VERSION=0.1.0
DEBUG=false
```

### Frontend (`frontend/.env`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Architecture Notes

- **Multi-tenant:** Row-Level Security (RLS) with `tenant_id` column. Middleware sets `app.current_tenant_id` per request.
- **Contracts:** Abstract base classes in `contracts/`. Implementations in `adapters/`. Stubs for testing.
- **Event Bus:** In-process async pub/sub. Events persisted to `events_log` table.
- **Auth:** JWT in-house (roles: consultant, admin, operator). Consultant bypasses RLS via `SET ROLE`.
- **Agent Routing:** Centralized router — classifies intent once, looks up agent registry, dispatches.
