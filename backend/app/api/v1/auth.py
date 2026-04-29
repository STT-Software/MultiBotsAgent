"""Auth endpoints: login and refresh."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_current_user, verify_password
from app.database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, tenant_id, hashed_password, role FROM users WHERE email = :email AND is_active = true"),
        {"email": body.email},
    )
    user = result.mappings().first()

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        user_id=str(user["id"]),
        tenant_id=str(user["tenant_id"]),
        role=user["role"],
    )
    return TokenResponse(access_token=token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(user: dict = Depends(get_current_user)):
    token = create_access_token(
        user_id=user["sub"],
        tenant_id=user.get("tenant_id"),
        role=user["role"],
    )
    return TokenResponse(access_token=token)
