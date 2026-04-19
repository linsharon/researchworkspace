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