import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Sequence

from models.activity import ActivityEvent
from models.auth import User
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class UserActivityStats:
    online_duration_ms: int = 0
    last_seen_ip: str = ""
    country: str = ""
    city: str = ""


class UserService:
    @staticmethod
    async def get_user_profile(db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user profile by user ID."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting get_user_profile - user_id: {user_id}")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        logger.debug(
            f"[DB_OP] Get user profile completed in {time.time() - start_time:.4f}s - found: {user is not None}"
        )
        return user

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        normalized_email = (email or "").strip().lower()
        if not normalized_email:
            return None

        result = await db.execute(
            select(User)
            .where(func.lower(User.email) == normalized_email)
            .order_by(User.last_login.desc(), User.created_at.desc())
        )
        return result.scalars().first()

    @staticmethod
    async def list_user_profiles(db: AsyncSession, user_ids: Sequence[str]) -> list[User]:
        unique_ids = [user_id for user_id in dict.fromkeys(user_ids) if user_id]
        if not unique_ids:
            return []

        result = await db.execute(select(User).where(User.id.in_(unique_ids)))
        return list(result.scalars().all())

    @staticmethod
    async def update_user_profile(
        db: AsyncSession,
        user_id: str,
        *,
        name: Optional[str] = None,
        bio: Optional[str] = None,
        avatar_url: Optional[str] = None,
        is_public: Optional[bool] = None,
    ) -> Optional[User]:
        """Update user profile."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting update_user_profile - user_id: {user_id}")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        logger.debug(f"[DB_OP] User lookup completed in {time.time() - start_time:.4f}s - found: {user is not None}")

        if user:
            changed = False

            if name is not None and user.name != name:
                user.name = name
                changed = True
            if bio is not None and (user.bio or "") != bio:
                user.bio = bio
                changed = True
            if avatar_url is not None and (user.avatar_url or "") != avatar_url:
                user.avatar_url = avatar_url
                changed = True
            if is_public is not None and bool(user.is_public) != bool(is_public):
                user.is_public = bool(is_public)
                changed = True

            if changed:
                user.profile_updated_at = datetime.now(timezone.utc)
                start_time_update = time.time()
                logger.debug("[DB_OP] Starting user profile update")
                await db.commit()
                await db.refresh(user)
                logger.debug(f"[DB_OP] User profile update completed in {time.time() - start_time_update:.4f}s")

        return user

    @staticmethod
    async def list_all_users(db: AsyncSession) -> list[User]:
        result = await db.execute(select(User).order_by(User.created_at.desc(), User.email.asc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_user_activity_stats(db: AsyncSession) -> dict[str, UserActivityStats]:
        aggregate_result = await db.execute(
            select(
                ActivityEvent.user_id,
                func.coalesce(func.sum(ActivityEvent.duration_ms), 0),
            )
            .where(ActivityEvent.user_id.is_not(None))
            .group_by(ActivityEvent.user_id)
        )
        totals = {
            str(user_id): int(total_duration or 0)
            for user_id, total_duration in aggregate_result.all()
            if user_id
        }

        latest_event_subquery = (
            select(
                ActivityEvent.user_id.label("user_id"),
                func.max(ActivityEvent.created_at).label("latest_created_at"),
            )
            .where(ActivityEvent.user_id.is_not(None))
            .group_by(ActivityEvent.user_id)
            .subquery()
        )

        latest_result = await db.execute(
            select(ActivityEvent.user_id, ActivityEvent.ip_address)
            .join(
                latest_event_subquery,
                and_(
                    ActivityEvent.user_id == latest_event_subquery.c.user_id,
                    ActivityEvent.created_at == latest_event_subquery.c.latest_created_at,
                ),
            )
        )

        stats: dict[str, UserActivityStats] = {}
        for user_id, total_duration in totals.items():
            stats[user_id] = UserActivityStats(online_duration_ms=total_duration)

        for user_id, ip_address in latest_result.all():
            if not user_id:
                continue
            entry = stats.setdefault(str(user_id), UserActivityStats())
            entry.last_seen_ip = ip_address or ""

        return stats

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: str) -> bool:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return False

        await db.delete(user)
        await db.commit()
        return True
