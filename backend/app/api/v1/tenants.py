from fastapi import APIRouter, Depends
from app.core.security import require_role

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])


@router.get("/")
async def list_tenants(user: dict = Depends(require_role(["consultant"]))):
    return {"data": [], "error": None}
