from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_public: Optional[bool] = None


class BatchUserProfilesRequest(BaseModel):
    user_ids: list[str] = Field(default_factory=list)


class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    username: str
    bio: str = ""
    avatar_url: str = ""
    is_public: bool = True
    updated_at: Optional[datetime] = None


class UserProfileSummaryResponse(BaseModel):
    user_id: str
    username: str
    bio: str = ""
    avatar_url: str = ""
    is_public: bool = True


class AdminUserSummaryResponse(BaseModel):
    user_id: str
    email: str
    username: str
    avatar_url: str = ""
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    role: str = "user"
    is_premium: bool = False
    online_duration_ms: int = 0
    last_seen_ip: str = ""
    country: str = ""
    city: str = ""
    payment_tag: str = ""


class AdminUserListResponse(BaseModel):
    total: int
    items: list[AdminUserSummaryResponse] = Field(default_factory=list)


class AdminUpdateUserRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    is_premium: Optional[bool] = None
    payment_tag: Optional[str] = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str