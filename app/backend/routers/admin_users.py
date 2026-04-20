import ipaddress
import logging
from typing import Optional

import httpx
from core.database import get_db
from dependencies.auth import get_admin_user, get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.auth import User
from schemas.auth import UserResponse
from schemas.user import (
    AdminResetPasswordRequest,
    AdminUpdateUserRequest,
    AdminUserListResponse,
    AdminUserSummaryResponse,
)
from services.admin_user_meta import admin_user_meta_store
from services.auth import apply_system_user_flags
from services.password_auth import hash_password
from services.user import UserActivityStats, UserService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

admin_router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])
logger = logging.getLogger(__name__)

PAYMENT_TAGS = {"paypal", "wechat"}
SYSTEM_ADMIN_EMAIL = "pandalinjingjing@gmail.com"
_geo_cache: dict[str, tuple[str, str]] = {}


def _derive_username(user: User) -> str:
    explicit_name = (user.name or "").strip()
    if explicit_name:
        return explicit_name
    email = (user.email or "").strip()
    if email and "@" in email:
        return email.split("@", 1)[0]
    return email or user.id or "User"


def _is_private_ip(ip_value: str) -> bool:
    try:
        return ipaddress.ip_address(ip_value).is_private
    except ValueError:
        return True


async def _lookup_geo(ip_value: str) -> tuple[str, str]:
    ip_value = (ip_value or "").strip()
    if not ip_value:
        return "", ""
    if ip_value in _geo_cache:
        return _geo_cache[ip_value]
    if _is_private_ip(ip_value):
        result = ("Private Network", "")
        _geo_cache[ip_value] = result
        return result

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"https://ipapi.co/{ip_value}/json/")
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        logger.debug("Geo lookup failed for %s: %s", ip_value, exc)
        result = ("", "")
        _geo_cache[ip_value] = result
        return result

    result = (
        str(payload.get("country_name") or ""),
        str(payload.get("city") or ""),
    )
    _geo_cache[ip_value] = result
    return result


async def _build_summary(user: User, stats: UserActivityStats, payment_tag: str) -> AdminUserSummaryResponse:
    country, city = await _lookup_geo(stats.last_seen_ip)
    return AdminUserSummaryResponse(
        user_id=user.id,
        email=user.email,
        username=_derive_username(user),
        avatar_url=user.avatar_url or "",
        created_at=user.created_at,
        last_login=user.last_login,
        role=user.role or "user",
        is_premium=bool(user.is_premium),
        online_duration_ms=stats.online_duration_ms,
        last_seen_ip=stats.last_seen_ip,
        country=country,
        city=city,
        payment_tag=payment_tag,
    )


async def _ensure_current_admin_row(db: AsyncSession, current_user: UserResponse) -> None:
    existing = await UserService.get_user_profile(db, current_user.id)
    if existing:
        changed = False
        normalized_email = (current_user.email or "").strip().lower()
        if normalized_email and (existing.email or "").strip().lower() != normalized_email:
            existing.email = normalized_email
            changed = True
        if current_user.name and existing.name != current_user.name:
            existing.name = current_user.name
            changed = True
        if existing.role != "admin":
            existing.role = "admin"
            changed = True
        if not bool(existing.is_premium):
            existing.is_premium = True
            changed = True
        apply_system_user_flags(existing)
        if changed:
            await db.commit()
            await db.refresh(existing)
        return

    user = User(
        id=current_user.id,
        email=(current_user.email or "").strip().lower(),
        name=current_user.name,
        role="admin",
        is_premium=True,
    )
    apply_system_user_flags(user)
    db.add(user)
    await db.commit()
    await db.refresh(user)


@admin_router.get("", response_model=AdminUserListResponse)
async def list_admin_users(
    q: str = Query(default="", max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_admin_user),
):
    await _ensure_current_admin_row(db, current_user)
    users = await UserService.list_all_users(db)
    keyword = q.strip().lower()
    if keyword:
        users = [
            user
            for user in users
            if keyword in (user.email or "").lower()
            or keyword in (user.name or "").lower()
            or keyword in (user.id or "").lower()
        ]

    activity_stats = await UserService.get_user_activity_stats(db)
    payment_tags = admin_user_meta_store.get_payment_tags([user.id for user in users])
    items: list[AdminUserSummaryResponse] = []
    for user in users:
        summary = await _build_summary(
            user,
            activity_stats.get(user.id, UserActivityStats()),
            payment_tags.get(user.id, ""),
        )
        items.append(summary)

    return AdminUserListResponse(total=len(items), items=items)


@admin_router.put("/{user_id}", response_model=AdminUserSummaryResponse)
async def update_admin_user(
    user_id: str,
    payload: AdminUpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email is not None:
        email = payload.email.strip().lower()
        if not email or "@" not in email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")
        if email != (user.email or "").strip().lower():
            duplicate = await db.execute(
                select(User).where(func.lower(User.email) == email, User.id != user_id)
            )
            if duplicate.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
            user.email = email

    if payload.username is not None:
        username = payload.username.strip()
        if not username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")
        user.name = username

    if payload.bio is not None:
        user.bio = payload.bio.strip()

    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url.strip()

    if payload.role is not None:
        role = payload.role.strip().lower()
        if role not in {"user", "admin"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        if user.email.strip().lower() == SYSTEM_ADMIN_EMAIL and role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary admin role cannot be changed")
        user.role = role

    if payload.is_premium is not None:
        if user.email.strip().lower() == SYSTEM_ADMIN_EMAIL and not payload.is_premium:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary admin premium state cannot be changed")
        user.is_premium = bool(payload.is_premium)

    apply_system_user_flags(user)
    await db.commit()
    await db.refresh(user)

    payment_tag = ""
    if payload.payment_tag is not None:
        normalized_tag = payload.payment_tag.strip().lower()
        if normalized_tag and normalized_tag not in PAYMENT_TAGS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment tag")
        payment_tag = admin_user_meta_store.set_payment_tag(user.id, normalized_tag)
    else:
        payment_tag = admin_user_meta_store.get_payment_tags([user.id]).get(user.id, "")

    activity_stats = await UserService.get_user_activity_stats(db)
    return await _build_summary(user, activity_stats.get(user.id, UserActivityStats()), payment_tag)


@admin_router.post("/{user_id}/reset-password", response_model=AdminUserSummaryResponse)
async def reset_admin_user_password(
    user_id: str,
    payload: AdminResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    del current_user
    new_password = payload.new_password.strip()
    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(new_password)
    await db.commit()
    await db.refresh(user)

    activity_stats = await UserService.get_user_activity_stats(db)
    payment_tag = admin_user_meta_store.get_payment_tags([user.id]).get(user.id, "")
    return await _build_summary(user, activity_stats.get(user.id, UserActivityStats()), payment_tag)


@admin_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if (user.email or "").strip().lower() == SYSTEM_ADMIN_EMAIL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary admin account cannot be deleted")

    deleted = await UserService.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    admin_user_meta_store.delete_user(user_id)
    return None