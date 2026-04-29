from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.get("/")
async def list_conversations(user: dict = Depends(get_current_user)):
    return {"data": [], "error": None}
