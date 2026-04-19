from models.base import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, true
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True, index=True)  # Use platform sub as primary key
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=False, default="", server_default="")
    avatar_url = Column(Text, nullable=False, default="", server_default="")
    is_public = Column(Boolean, default=True, nullable=False, server_default=true())
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # user/admin
    is_premium = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    profile_updated_at = Column(DateTime(timezone=True), nullable=True)


class OIDCState(Base):
    __tablename__ = "oidc_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(255), unique=True, index=True, nullable=False)
    nonce = Column(String(255), nullable=False)
    code_verifier = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
