from datetime import datetime
from typing import List, Optional

from dependencies.auth import get_admin_user
from dependencies.database import get_db
from fastapi import APIRouter, Depends, Query
from models.activity import ActivityEvent
from pydantic import BaseModel, field_validator
from schemas.auth import UserResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin/activity", tags=["admin-activity"])


class ActivityEventResponse(BaseModel):
    id: int
    event_type: str
    action: str
    path: str
    status_code: int
    user_id: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    request_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    error_type: Optional[str]
    duration_ms: Optional[int]
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


class ActivityEventListResponse(BaseModel):
    total: int
    items: List[ActivityEventResponse]


class ActivitySummaryResponse(BaseModel):
    total: int
    success: int
    failed: int


@router.get("/events", response_model=ActivityEventListResponse)
async def list_activity_events(
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    path: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    from_time: Optional[str] = Query(None, description="ISO datetime"),
    to_time: Optional[str] = Query(None, description="ISO datetime"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _current_user: UserResponse = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """List activity events with admin-only access and filters."""
    query = select(ActivityEvent)
    count_query = select(func.count()).select_from(ActivityEvent)

    if user_id:
        query = query.where(ActivityEvent.user_id == user_id)
        count_query = count_query.where(ActivityEvent.user_id == user_id)
    if event_type:
        query = query.where(ActivityEvent.event_type == event_type)
        count_query = count_query.where(ActivityEvent.event_type == event_type)
    if path:
        query = query.where(ActivityEvent.path.ilike(f"%{path}%"))
        count_query = count_query.where(ActivityEvent.path.ilike(f"%{path}%"))
    if resource_type:
        query = query.where(ActivityEvent.resource_type == resource_type)
        count_query = count_query.where(ActivityEvent.resource_type == resource_type)
    if resource_id:
        query = query.where(ActivityEvent.resource_id == resource_id)
        count_query = count_query.where(ActivityEvent.resource_id == resource_id)

    parsed_from: Optional[datetime] = None
    parsed_to: Optional[datetime] = None
    if from_time:
        parsed_from = datetime.fromisoformat(from_time)
    if to_time:
        parsed_to = datetime.fromisoformat(to_time)

    if parsed_from:
        query = query.where(ActivityEvent.created_at >= parsed_from)
        count_query = count_query.where(ActivityEvent.created_at >= parsed_from)
    if parsed_to:
        query = query.where(ActivityEvent.created_at <= parsed_to)
        count_query = count_query.where(ActivityEvent.created_at <= parsed_to)

    total_result = await session.execute(count_query)
    total = int(total_result.scalar_one())

    result = await session.execute(
        query.order_by(ActivityEvent.created_at.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return ActivityEventListResponse(total=total, items=items)


@router.get("/summary", response_model=ActivitySummaryResponse)
async def activity_summary(
    _current_user: UserResponse = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """Get quick health summary for recorded activity events."""
    total_result = await session.execute(select(func.count()).select_from(ActivityEvent))
    success_result = await session.execute(
        select(func.count()).select_from(ActivityEvent).where(ActivityEvent.status_code < 400)
    )
    failed_result = await session.execute(
        select(func.count()).select_from(ActivityEvent).where(ActivityEvent.status_code >= 400)
    )

    return ActivitySummaryResponse(
        total=int(total_result.scalar_one()),
        success=int(success_result.scalar_one()),
        failed=int(failed_result.scalar_one()),
    )
