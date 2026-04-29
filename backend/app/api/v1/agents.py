from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.get("/")
async def list_agents(user: dict = Depends(get_current_user)):
    return {"data": [], "error": None}
