import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.agents import router as agents_router
from app.api.v1.auth import router as auth_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.webhooks import router as webhooks_router
from app.config import get_settings
from app.database import check_db_connection
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.tenant import TenantMiddleware

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await check_db_connection()
        logger.info("PostgreSQL connection verified")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        raise
    yield


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

# Middleware (order matters: last added = first executed)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(agents_router)
app.include_router(tenants_router)
app.include_router(knowledge_router)
app.include_router(integrations_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
