from datetime import datetime, timezone
from typing import Optional

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.auth import User
from pydantic import BaseModel
from schemas.auth import UserResponse
from schemas.user import (
    BatchUserProfilesRequest,
    UpdateProfileRequest,
    UserProfileResponse,
    UserProfileSummaryResponse,
)
from services.auth import apply_system_user_flags
from services.user import UserService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UserSearchResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


def _derive_username(user: User) -> str:
    explicit_name = (user.name or "").strip()
    if explicit_name:
        return explicit_name
    email = (user.email or "").strip()
    if email and "@" in email:
        return email.split("@", 1)[0]
    return email or user.id or "User"


def _profile_updated_at(user: User) -> datetime:
    return user.profile_updated_at or user.last_login or user.created_at or datetime.now(timezone.utc)


def _to_profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        user_id=user.id,
        email=user.email,
        username=_derive_username(user),
        bio=user.bio or "",
        avatar_url=user.avatar_url or "",
        is_public=bool(user.is_public),
        updated_at=_profile_updated_at(user),
    )


def _to_profile_summary(user: User) -> UserProfileSummaryResponse:
    return UserProfileSummaryResponse(
        user_id=user.id,
        username=_derive_username(user),
        bio=user.bio or "",
        avatar_url=user.avatar_url or "",
        is_public=bool(user.is_public),
    )


async def _get_or_create_user(db: AsyncSession, current_user) -> User:
    """Fetch user from DB; auto-create if authenticated but no DB row yet."""
    user = await UserService.get_user_profile(db, current_user.id)
    if not user:
        user = User(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            role=current_user.role,
            is_premium=bool(current_user.is_premium),
        )
        apply_system_user_flags(user)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    profile = await _get_or_create_user(db, current_user)
    return _to_profile_response(profile)


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile"""
    username = profile_data.username.strip() if profile_data.username is not None else None
    if username == "":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")

    bio = profile_data.bio.strip() if profile_data.bio is not None else None
    avatar_url = profile_data.avatar_url.strip() if profile_data.avatar_url is not None else None

    # Ensure user row exists (auto-create if needed)
    await _get_or_create_user(db, current_user)

    profile = await UserService.update_user_profile(
        db,
        current_user.id,
        name=username,
        bio=bio,
        avatar_url=avatar_url,
        is_public=profile_data.is_public,
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return _to_profile_response(profile)


@router.get("/public/{user_id}", response_model=UserProfileResponse)
async def get_public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await UserService.get_user_profile(db, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    if profile.id != current_user.id and not profile.is_public:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return _to_profile_response(profile)


@router.post("/profiles/batch", response_model=list[UserProfileSummaryResponse])
async def batch_profiles(
    payload: BatchUserProfilesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = await UserService.list_user_profiles(db, payload.user_ids)
    return [
        _to_profile_summary(user)
        for user in users
        if user.id == current_user.id or user.is_public
    ]


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
