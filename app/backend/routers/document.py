import json
import re
from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from core.config import settings
from dependencies.auth import get_current_user
from dependencies.database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from models.document import Document, DocumentVersion
from models.manuscript import Project
from schemas.auth import UserResponse
from schemas.document import (
    DocumentCreate,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadCompleteRequest,
    DocumentUploadInitRequest,
    DocumentUploadInitResponse,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentVersionResponse,
)
from schemas.storage import FileUpDownRequest
from services.storage import StorageService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

STATUS_TRANSITIONS = {
    "draft": {"review", "archived"},
    "review": {"draft", "published", "archived"},
    "published": {"archived"},
    "archived": {"draft"},
}


async def ensure_owned_project_or_404(session: AsyncSession, project_id: str, user_id: str) -> Project:
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.owner_user_id:
        project.owner_user_id = user_id
        await session.commit()
        await session.refresh(project)
        return project

    if project.owner_user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


async def get_owned_document_or_404(
    session: AsyncSession,
    document_id: str,
    user_id: str,
    include_deleted: bool = False,
) -> Document:
    result = await session.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_user_id == user_id,
        )
    )
    document = result.scalar_one_or_none()
    if not document or (document.is_deleted and not include_deleted):
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def ensure_permission_allowed(permission: str, current_user: UserResponse, project_id: str | None) -> None:
    if permission not in {"private", "team", "public"}:
        raise HTTPException(status_code=400, detail="Invalid document permission")
    if permission == "team" and not project_id:
        raise HTTPException(status_code=400, detail="Team permission requires project_id")
    if permission == "public" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can set public permission")


def ensure_status_allowed(status: str, current_user: UserResponse) -> None:
    if status not in STATUS_TRANSITIONS:
        raise HTTPException(status_code=400, detail="Invalid document status")
    if status == "published" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can publish document")


def ensure_status_transition_allowed(current_status: str, next_status: str, current_user: UserResponse) -> None:
    if next_status == current_status:
        return
    if next_status not in STATUS_TRANSITIONS.get(current_status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current_status} -> {next_status}",
        )
    if next_status == "published" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can publish document")


def sanitize_filename(filename: str) -> str:
    base = filename.strip().split("/")[-1].split("\\")[-1]
    if not base:
        raise HTTPException(status_code=400, detail="Invalid filename")
    safe = re.sub(r"[^A-Za-z0-9._-]", "-", base)
    return safe[:255]


async def get_next_document_version(session: AsyncSession, document_id: str) -> int:
    result = await session.execute(
        select(func.max(DocumentVersion.version_number)).where(DocumentVersion.document_id == document_id)
    )
    current_max_version = result.scalar_one()
    return 1 if current_max_version is None else current_max_version + 1


@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    payload: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    if payload.project_id:
        await ensure_owned_project_or_404(session, payload.project_id, current_user.id)

    ensure_permission_allowed(payload.permission, current_user, payload.project_id)
    ensure_status_allowed(payload.status, current_user)

    document = Document(
        id=str(uuid4()),
        owner_user_id=current_user.id,
        project_id=payload.project_id,
        title=payload.title,
        description=payload.description,
        tags=json.dumps(payload.tags),
        status=payload.status,
        permission=payload.permission,
        storage_provider=payload.storage_provider,
        bucket_name=payload.bucket_name,
        object_key=payload.object_key,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    project_id: str | None = Query(default=None),
    include_deleted: bool = Query(default=False),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    stmt = select(Document).where(Document.owner_user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Document.project_id == project_id)
    if not include_deleted:
        stmt = stmt.where(Document.is_deleted.is_(False))

    result = await session.execute(stmt.order_by(Document.updated_at.desc(), Document.created_at.desc()))
    return result.scalars().all()


@router.get("/search", response_model=DocumentListResponse)
async def search_documents(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    stmt = select(Document).where(
        Document.owner_user_id == current_user.id,
        Document.is_deleted.is_(False),
    )
    count_stmt = select(func.count()).select_from(Document).where(
        Document.owner_user_id == current_user.id,
        Document.is_deleted.is_(False),
    )

    if project_id:
        stmt = stmt.where(Document.project_id == project_id)
        count_stmt = count_stmt.where(Document.project_id == project_id)
    if status:
        stmt = stmt.where(Document.status == status)
        count_stmt = count_stmt.where(Document.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Document.title.ilike(like)) | (Document.description.ilike(like)))
        count_stmt = count_stmt.where((Document.title.ilike(like)) | (Document.description.ilike(like)))
    if tag:
        tag_like = f'%"{tag}"%'
        stmt = stmt.where(Document.tags.like(tag_like))
        count_stmt = count_stmt.where(Document.tags.like(tag_like))

    total_result = await session.execute(count_stmt)
    total = int(total_result.scalar_one())

    result = await session.execute(
        stmt.order_by(Document.updated_at.desc(), Document.created_at.desc()).offset(offset).limit(limit)
    )
    return DocumentListResponse(total=total, items=result.scalars().all())


@router.get("/recycle-bin", response_model=DocumentListResponse)
async def list_recycle_bin_documents(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    stmt = select(Document).where(
        Document.owner_user_id == current_user.id,
        Document.is_deleted.is_(True),
    )
    count_stmt = select(func.count()).select_from(Document).where(
        Document.owner_user_id == current_user.id,
        Document.is_deleted.is_(True),
    )

    total_result = await session.execute(count_stmt)
    total = int(total_result.scalar_one())
    result = await session.execute(
        stmt.order_by(Document.deleted_at.desc(), Document.updated_at.desc()).offset(offset).limit(limit)
    )
    return DocumentListResponse(total=total, items=result.scalars().all())


@router.post("/{document_id}/upload-url", response_model=DocumentUploadInitResponse)
async def create_document_upload_url(
    document_id: str,
    payload: DocumentUploadInitRequest,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id)

    if not settings.oss_service_url or not settings.oss_api_key:
        raise HTTPException(status_code=503, detail="OSS service is not configured")

    next_version = await get_next_document_version(session, document.id)
    safe_filename = sanitize_filename(payload.filename)
    prefix = (payload.object_prefix or f"documents/{current_user.id}/{document.id}").strip("/")
    object_key = f"{prefix}/v{next_version}-{safe_filename}"

    storage_service = StorageService()
    upload_data = await storage_service.create_upload_url(
        FileUpDownRequest(bucket_name=payload.bucket_name, object_key=object_key)
    )

    return DocumentUploadInitResponse(
        bucket_name=payload.bucket_name,
        object_key=object_key,
        upload_url=upload_data.upload_url,
        expires_at=upload_data.expires_at,
        suggested_version_number=next_version,
    )


@router.post("/{document_id}/upload-complete", response_model=DocumentVersionResponse, status_code=201)
async def confirm_document_upload_complete(
    document_id: str,
    payload: DocumentUploadCompleteRequest,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id)
    next_version = await get_next_document_version(session, document.id)

    version = DocumentVersion(
        id=str(uuid4()),
        document_id=document.id,
        version_number=next_version,
        filename=sanitize_filename(payload.filename),
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        checksum=payload.checksum,
        bucket_name=payload.bucket_name,
        object_key=payload.object_key,
        change_note=payload.change_note,
        created_by_user_id=current_user.id,
    )
    session.add(version)

    document.bucket_name = payload.bucket_name
    document.object_key = payload.object_key

    await session.commit()
    await session.refresh(version)
    return version


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    return await get_owned_document_or_404(session, document_id, current_user.id)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id)

    update_data = payload.model_dump(exclude_unset=True)

    if "permission" in update_data:
        effective_project_id = update_data.get("project_id", document.project_id)
        ensure_permission_allowed(update_data["permission"], current_user, effective_project_id)

    if "status" in update_data:
        ensure_status_transition_allowed(document.status, update_data["status"], current_user)
    if "tags" in update_data and update_data["tags"] is not None:
        update_data["tags"] = json.dumps(update_data["tags"])

    for key, value in update_data.items():
        setattr(document, key, value)

    await session.commit()
    await session.refresh(document)
    return document


@router.delete("/{document_id}")
async def soft_delete_document(
    document_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id)
    document.is_deleted = True
    document.deleted_at = datetime.now(timezone.utc)

    await session.commit()
    return {"message": "Document moved to recycle bin"}


@router.post("/{document_id}/restore", response_model=DocumentResponse)
async def restore_document(
    document_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id, include_deleted=True)
    document.is_deleted = False
    document.deleted_at = None

    if document.status == "archived":
        # Keep archived docs explicit until user/admin transitions them.
        pass

    await session.commit()
    await session.refresh(document)
    return document


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse, status_code=201)
async def create_document_version(
    document_id: str,
    payload: DocumentVersionCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id)

    if document.status == "archived":
        raise HTTPException(status_code=400, detail="Archived document does not accept new versions")

    next_version = await get_next_document_version(session, document.id)

    version = DocumentVersion(
        id=str(uuid4()),
        document_id=document.id,
        version_number=next_version,
        filename=payload.filename,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        checksum=payload.checksum,
        bucket_name=payload.bucket_name,
        object_key=payload.object_key,
        change_note=payload.change_note,
        created_by_user_id=current_user.id,
    )
    session.add(version)

    if payload.bucket_name:
        document.bucket_name = payload.bucket_name
    if payload.object_key:
        document.object_key = payload.object_key

    await session.commit()
    await session.refresh(version)
    return version


@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
async def list_document_versions(
    document_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id, include_deleted=True)

    result = await session.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document.id)
        .order_by(DocumentVersion.version_number.desc(), DocumentVersion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{document_id}/status", response_model=DocumentResponse)
async def change_document_status(
    document_id: str,
    payload: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    if payload.status is None:
        raise HTTPException(status_code=400, detail="status is required")

    document = await get_owned_document_or_404(session, document_id, current_user.id)
    ensure_status_transition_allowed(document.status, payload.status, current_user)
    document.status = payload.status

    await session.commit()
    await session.refresh(document)
    return document
