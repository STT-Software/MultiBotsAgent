# MultiBootsAgent

Plataforma Omnicanal IA para PYMES — sistema multiagente gestionado por WhatsApp para diferentes áreas y operaciones de una empresa, como RAG, cotización o agendamiento.

## Quick Start

```bash
docker compose up --build
```

Servicios disponibles:

| Servicio | URL |
|----------|-----|
| Backend (FastAPI) | http://localhost:8000 |
| Frontend (Next.js) | http://localhost:3000 |
| Health check | http://localhost:8000/health |
| PostgreSQL | localhost:5432 |

## Estructura del Proyecto

```
├── backend/          # Python 3.11 + FastAPI
├── frontend/         # Next.js 14 + React 18 (pnpm)
├── Docs/             # Documentación de iniciativa y soluciones
└── docker-compose.yml
```

## Variables de Entorno

Copiar los archivos de ejemplo:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Desarrollo Local

**Backend:**
```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
```

**Tests:**
```bash
cd backend
pytest
ruff check .
```
