from models.base import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, index=True)
    owner_user_id = Column(String(255), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)

    status = Column(String(50), nullable=False, default="draft")
    permission = Column(String(50), nullable=False, default="private")

    storage_provider = Column(String(50), nullable=False, default="minio")
    bucket_name = Column(String(255), nullable=True)
    object_key = Column(String(1024), nullable=True)

    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    access_grants = relationship("DocumentAccessGrant", back_populates="document", cascade="all, delete-orphan")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, index=True)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)

    filename = Column(String(500), nullable=False)
    content_type = Column(String(255), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    checksum = Column(String(255), nullable=True)

    bucket_name = Column(String(255), nullable=True)
    object_key = Column(String(1024), nullable=True)
    change_note = Column(Text, nullable=True)
    created_by_user_id = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("Document", back_populates="versions")


class DocumentAccessGrant(Base):
    __tablename__ = "document_access_grants"
    __table_args__ = (UniqueConstraint("document_id", "grantee_user_id", name="uq_document_access_grant_user"),)

    id = Column(String(36), primary_key=True, index=True)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    grantee_user_id = Column(String(255), ForeignKey("users.id"), nullable=False, index=True)
    granted_by_user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    access_level = Column(String(20), nullable=False, default="read")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    document = relationship("Document", back_populates="access_grants")
