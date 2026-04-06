from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str  # Now a string UUID (platform sub)
    email: str
    name: Optional[str] = None
    role: str = "user"  # user/admin
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlatformTokenExchangeRequest(BaseModel):
    """Request body for exchanging Platform token for app token."""

    platform_token: str


class TokenExchangeResponse(BaseModel):
    """Response body for issued application token."""

    token: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class PasswordLoginRequest(BaseModel):
    email: str
    password: str


class AuthTokenResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    expires_at: int
    user: UserResponse
