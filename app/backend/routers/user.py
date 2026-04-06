from typing import Optional

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.auth import User
from pydantic import BaseModel
from schemas.auth import UserResponse
from services.user import UserService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None


class UserSearchResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


@router.get("/profile", response_model=UserResponse)
async def get_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    profile = await UserService.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return profile


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile"""
    profile = await UserService.update_user_profile(db, current_user.id, profile_data.name)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return profile


@router.get("/search", response_model=list[UserSearchResponse])
async def search_users(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search users by email/name/id for share recipient selection."""
    keyword = q.strip()
    if not keyword:
        return []

    like = f"%{keyword}%"
    result = await db.execute(
        select(User)
        .where(
            User.id != current_user.id,
            (User.email.ilike(like)) | (User.name.ilike(like)) | (User.id.ilike(like)),
        )
        .order_by(User.last_login.desc(), User.created_at.desc())
        .limit(limit)
    )
    users = result.scalars().all()
    return [UserSearchResponse(id=u.id, email=u.email, name=u.name) for u in users]
