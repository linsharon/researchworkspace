import json
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


DocumentStatus = Literal["draft", "review", "published", "archived"]
DocumentPermission = Literal["private", "team", "public"]


class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    project_id: Optional[str] = None
    status: DocumentStatus = "draft"
    permission: DocumentPermission = "private"
    storage_provider: str = "minio"
    bucket_name: Optional[str] = None
    object_key: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[DocumentStatus] = None
    permission: Optional[DocumentPermission] = None
    bucket_name: Optional[str] = None
    object_key: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    owner_user_id: str
    project_id: Optional[str]
    title: str
    description: Optional[str]
    tags: List[str]
    status: DocumentStatus
    permission: DocumentPermission
    storage_provider: str
    bucket_name: Optional[str]
    object_key: Optional[str]
    is_deleted: bool
    deleted_at: Optional[str]
    created_at: str
    updated_at: str

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                return []
        return []

    @field_validator("deleted_at", "created_at", "updated_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


class DocumentVersionCreate(BaseModel):
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    bucket_name: Optional[str] = None
    object_key: Optional[str] = None
    change_note: Optional[str] = None


class DocumentVersionResponse(BaseModel):
    id: str
    document_id: str
    version_number: int
    filename: str
    content_type: Optional[str]
    size_bytes: Optional[int]
    checksum: Optional[str]
    bucket_name: Optional[str]
    object_key: Optional[str]
    change_note: Optional[str]
    created_by_user_id: str
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


class DocumentUploadInitRequest(BaseModel):
    filename: str
    content_type: Optional[str] = None
    bucket_name: str = "documents"
    object_prefix: Optional[str] = None


class DocumentUploadInitResponse(BaseModel):
    bucket_name: str
    object_key: str
    upload_url: str
    expires_at: str
    suggested_version_number: int


class DocumentUploadCompleteRequest(BaseModel):
    bucket_name: str
    object_key: str
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    change_note: Optional[str] = None


class DocumentListResponse(BaseModel):
    total: int
    items: List[DocumentResponse]
