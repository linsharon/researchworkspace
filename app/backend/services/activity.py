import logging
from typing import Optional

from core.auth import AccessTokenError, decode_access_token
from core.database import db_manager
from models.activity import ActivityEvent

logger = logging.getLogger(__name__)


def extract_user_id_from_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Best-effort user extraction for audit events without impacting request flow."""
    if not authorization:
        return None

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    if not token:
        return None

    try:
        payload = decode_access_token(token)
        return payload.get("sub")
    except AccessTokenError:
        return None


async def log_activity_event(
    *,
    event_type: str,
    action: str,
    path: str,
    status_code: int,
    user_id: Optional[str],
    request_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str],
    error_type: Optional[str],
    duration_ms: Optional[int],
) -> None:
    """Persist an activity event in an isolated DB session."""
    if not db_manager.async_session_maker:
        return

    try:
        async with db_manager.async_session_maker() as session:
            event = ActivityEvent(
                event_type=event_type,
                action=action,
                path=path,
                status_code=status_code,
                user_id=user_id,
                request_id=request_id,
                ip_address=ip_address,
                user_agent=user_agent,
                error_type=error_type,
                duration_ms=duration_ms,
            )
            session.add(event)
            await session.commit()
    except Exception as exc:  # pragma: no cover - defensive audit logging
        logger.warning("Failed to persist activity event: %s", exc)
