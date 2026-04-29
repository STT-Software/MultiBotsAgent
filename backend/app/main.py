import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.database import check_db_connection

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


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
