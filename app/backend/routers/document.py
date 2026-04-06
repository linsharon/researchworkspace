import json
import re
from datetime import date, datetime, time, timezone
from typing import List
from uuid import uuid4

from dependencies.auth import get_current_user
from dependencies.database import get_db
from core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from models.auth import User
from models.document import Document, DocumentAccessGrant, DocumentVersion
from models.manuscript import Project
from schemas.auth import UserResponse
from schemas.document import (
    DocumentCreate,
    DocumentDownloadRequest,
    DocumentListResponse,
    DocumentResponse,
    DocumentShareCreate,
    DocumentShareResponse,
    DocumentUploadCompleteRequest,
    DocumentUploadInitRequest,
    DocumentUploadInitResponse,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentVersionRestoreRequest,
    DocumentVersionResponse,
)
from schemas.storage import FileUpDownRequest, FileUpDownResponse
from services.activity import log_activity_event
from services.rate_limit import rate_limiter
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


async def get_document_with_access_or_404(
    session: AsyncSession,
    document_id: str,
    user_id: str,
    require_write: bool = False,
    include_deleted: bool = False,
) -> Document:
    """Return document if user owns it, has a share grant, or document is public.
    Sets synthetic attributes `effective_access_level` and `is_owner` on the returned object.
    """
    result = await session.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if not document or (document.is_deleted and not include_deleted):
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_user_id == user_id:
        setattr(document, "effective_access_level", "owner")
        setattr(document, "is_owner", True)
        return document

    # Public documents are readable by all authenticated users
    if document.permission == "public" and not require_write:
        setattr(document, "effective_access_level", "read")
        setattr(document, "is_owner", False)
        return document

    # Check explicit share grant
    grant_result = await session.execute(
        select(DocumentAccessGrant).where(
            DocumentAccessGrant.document_id == document_id,
            DocumentAccessGrant.grantee_user_id == user_id,
        )
    )
    grant = grant_result.scalar_one_or_none()
    if grant:
        if require_write and grant.access_level != "edit":
            raise HTTPException(status_code=403, detail="You have read-only access to this document")
        setattr(document, "effective_access_level", grant.access_level)
        setattr(document, "is_owner", False)
        return document

    raise HTTPException(status_code=404, detail="Document not found")


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


def parse_datetime_filter(value: str, end_of_day: bool = False) -> datetime:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid datetime filter")

    try:
        if len(normalized) == 10:
            parsed_date = date.fromisoformat(normalized)
            parsed_time = time.max if end_of_day else time.min
            return datetime.combine(parsed_date, parsed_time, tzinfo=timezone.utc)

        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid datetime filter: {value}") from exc


async def log_document_activity(
    request: Request,
    *,
    event_type: str,
    action: str,
    user_id: str,
    resource_type: str,
    resource_id: str,
    status_code: int = 200,
) -> None:
    await log_activity_event(
        event_type=event_type,
        action=action,
        path=request.url.path,
        status_code=status_code,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        request_id=getattr(request.state, "request_id", None),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        error_type=None,
        duration_ms=None,
    )


async def get_document_version_or_404(session: AsyncSession, document_id: str, version_id: str) -> DocumentVersion:
    result = await session.execute(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Document version not found")
    return version


async def get_next_document_version(session: AsyncSession, document_id: str) -> int:
    result = await session.execute(
        select(func.max(DocumentVersion.version_number)).where(DocumentVersion.document_id == document_id)
    )
    current_max_version = result.scalar_one()
    return 1 if current_max_version is None else current_max_version + 1


@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    payload: DocumentCreate,
    request: Request,
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
    await log_document_activity(
        request,
        event_type="document.lifecycle",
        action="create",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        status_code=201,
    )
    return document


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    project_id: str | None = Query(default=None),
    include_deleted: bool = Query(default=False),
    include_shared: bool = Query(default=False, description="Include documents shared with this user"),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    stmt = select(Document).where(Document.owner_user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Document.project_id == project_id)
    if not include_deleted:
        stmt = stmt.where(Document.is_deleted.is_(False))

    result = await session.execute(stmt.order_by(Document.updated_at.desc(), Document.created_at.desc()))
    owned_docs: List[Document] = list(result.scalars().all())
    for doc in owned_docs:
        setattr(doc, "effective_access_level", "owner")
        setattr(doc, "is_owner", True)

    if not include_shared:
        return owned_docs

    # Fetch documents this user has an explicit share grant for
    shared_stmt = (
        select(Document, DocumentAccessGrant.access_level)
        .join(DocumentAccessGrant, DocumentAccessGrant.document_id == Document.id)
        .where(
            DocumentAccessGrant.grantee_user_id == current_user.id,
            Document.is_deleted.is_(False),
        )
    )
    shared_result = await session.execute(shared_stmt)
    shared_docs: List[Document] = []
    owned_ids = {d.id for d in owned_docs}
    for row in shared_result.all():
        doc, access_level = row[0], row[1]
        if doc.id not in owned_ids:
            setattr(doc, "effective_access_level", access_level)
            setattr(doc, "is_owner", False)
            shared_docs.append(doc)

    return owned_docs + shared_docs


@router.get("/search", response_model=DocumentListResponse)
async def search_documents(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    permission: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    owner_user_id: str | None = Query(default=None),
    created_from: str | None = Query(default=None),
    created_to: str | None = Query(default=None),
    updated_from: str | None = Query(default=None),
    updated_to: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    if settings.search_rate_limit_enabled:
        allowed, _remaining, retry_after = await rate_limiter.allow(
            scope="documents.search",
            key=current_user.id,
            max_requests=max(1, settings.search_rate_limit_max_requests),
            window_seconds=max(1, settings.search_rate_limit_window_seconds),
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=f"Search rate limit exceeded, retry after {retry_after} seconds",
            )

    effective_owner_user_id = current_user.id
    if owner_user_id:
        if current_user.role != "admin" and owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only admin can query other owners")
        effective_owner_user_id = owner_user_id

    stmt = select(Document).where(Document.owner_user_id == effective_owner_user_id, Document.is_deleted.is_(False))
    count_stmt = select(func.count()).select_from(Document).where(
        Document.owner_user_id == effective_owner_user_id,
        Document.is_deleted.is_(False),
    )
    use_postgres_fts_ordering = False
    fts_vector = None
    fts_query = None
    fts_headline = None

    if project_id:
        stmt = stmt.where(Document.project_id == project_id)
        count_stmt = count_stmt.where(Document.project_id == project_id)
    if status:
        stmt = stmt.where(Document.status == status)
        count_stmt = count_stmt.where(Document.status == status)
    if permission:
        stmt = stmt.where(Document.permission == permission)
        count_stmt = count_stmt.where(Document.permission == permission)
    if q:
        bind = session.get_bind()
        dialect_name = bind.dialect.name if bind is not None else ""
        if dialect_name == "postgresql":
            fts_vector = func.to_tsvector(
                "simple",
                func.concat_ws(
                    " ",
                    func.coalesce(Document.title, ""),
                    func.coalesce(Document.description, ""),
                    func.coalesce(Document.tags, ""),
                ),
            )
            fts_query = func.websearch_to_tsquery("simple", q)
            fts_headline = func.ts_headline(
                "simple",
                func.concat_ws(
                    " ",
                    func.coalesce(Document.title, ""),
                    func.coalesce(Document.description, ""),
                    func.coalesce(Document.tags, ""),
                ),
                fts_query,
                "StartSel=[[, StopSel=]], MaxFragments=2, MinWords=4, MaxWords=12, ShortWord=2, HighlightAll=false",
            ).label("search_highlight")
            stmt = stmt.where(fts_vector.op("@@")(fts_query))
            count_stmt = count_stmt.where(fts_vector.op("@@")(fts_query))
            use_postgres_fts_ordering = True
        else:
            like = f"%{q}%"
            stmt = stmt.where((Document.title.ilike(like)) | (Document.description.ilike(like)))
            count_stmt = count_stmt.where((Document.title.ilike(like)) | (Document.description.ilike(like)))
    if tag:
        tag_like = f'%"{tag}"%'
        stmt = stmt.where(Document.tags.like(tag_like))
        count_stmt = count_stmt.where(Document.tags.like(tag_like))
    if created_from:
        parsed_created_from = parse_datetime_filter(created_from)
        stmt = stmt.where(Document.created_at >= parsed_created_from)
        count_stmt = count_stmt.where(Document.created_at >= parsed_created_from)
    if created_to:
        parsed_created_to = parse_datetime_filter(created_to, end_of_day=True)
        stmt = stmt.where(Document.created_at <= parsed_created_to)
        count_stmt = count_stmt.where(Document.created_at <= parsed_created_to)
    if updated_from:
        parsed_updated_from = parse_datetime_filter(updated_from)
        stmt = stmt.where(Document.updated_at >= parsed_updated_from)
        count_stmt = count_stmt.where(Document.updated_at >= parsed_updated_from)
    if updated_to:
        parsed_updated_to = parse_datetime_filter(updated_to, end_of_day=True)
        stmt = stmt.where(Document.updated_at <= parsed_updated_to)
        count_stmt = count_stmt.where(Document.updated_at <= parsed_updated_to)

    total_result = await session.execute(count_stmt)
    total = int(total_result.scalar_one())

    if use_postgres_fts_ordering and fts_vector is not None and fts_query is not None:
        if fts_headline is not None:
            stmt = stmt.add_columns(fts_headline)
        stmt = stmt.order_by(
            func.ts_rank_cd(fts_vector, fts_query).desc(),
            Document.updated_at.desc(),
            Document.created_at.desc(),
        )
    else:
        stmt = stmt.order_by(Document.updated_at.desc(), Document.created_at.desc())

    result = await session.execute(stmt.offset(offset).limit(limit))

    if use_postgres_fts_ordering and fts_headline is not None:
        rows = result.all()
        items: List[Document] = []
        for row in rows:
            document = row[0]
            search_highlight = row[1] if len(row) > 1 else None
            setattr(document, "search_highlight", search_highlight)
            items.append(document)
        return DocumentListResponse(total=total, items=items)

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

    next_version = await get_next_document_version(session, document.id)
    safe_filename = sanitize_filename(payload.filename)
    prefix = (payload.object_prefix or f"documents/{current_user.id}/{document.id}").strip("/")
    object_key = f"{prefix}/v{next_version}-{safe_filename}"

    try:
        storage_service = StorageService()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

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
    request: Request,
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
    await log_document_activity(
        request,
        event_type="document.version",
        action="upload_complete",
        user_id=current_user.id,
        resource_type="document_version",
        resource_id=version.id,
        status_code=201,
    )
    return version


@router.post("/{document_id}/download-url", response_model=FileUpDownResponse)
async def create_document_download_url(
    document_id: str,
    payload: DocumentDownloadRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_document_with_access_or_404(session, document_id, current_user.id)

    bucket_name = document.bucket_name
    object_key = document.object_key
    resource_type = "document"
    resource_id = document.id

    if payload.version_id:
        version = await get_document_version_or_404(session, document.id, payload.version_id)
        bucket_name = version.bucket_name
        object_key = version.object_key
        resource_type = "document_version"
        resource_id = version.id

    if not bucket_name or not object_key:
        raise HTTPException(status_code=400, detail="No file available for download")

    try:
        storage_service = StorageService()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    download_data = await storage_service.create_download_url(
        FileUpDownRequest(bucket_name=bucket_name, object_key=object_key)
    )
    await log_document_activity(
        request,
        event_type="document.access",
        action="download",
        user_id=current_user.id,
        resource_type=resource_type,
        resource_id=resource_id,
        status_code=200,
    )
    return download_data


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    return await get_document_with_access_or_404(session, document_id, current_user.id)


@router.get("/{document_id}/share", response_model=List[DocumentShareResponse])
async def list_document_shares(
    document_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all access grants for a document (owner only)."""
    await get_owned_document_or_404(session, document_id, current_user.id)
    result = await session.execute(
        select(DocumentAccessGrant, User)
        .outerjoin(User, User.id == DocumentAccessGrant.grantee_user_id)
        .where(DocumentAccessGrant.document_id == document_id)
    )
    items: List[DocumentShareResponse] = []
    for grant, user in result.all():
        items.append(
            DocumentShareResponse(
                document_id=grant.document_id,
                grantee_user_id=grant.grantee_user_id,
                grantee_email=user.email if user else None,
                grantee_name=user.name if user else None,
                granted_by_user_id=grant.granted_by_user_id,
                access_level=grant.access_level,
                created_at=grant.created_at,
                updated_at=grant.updated_at,
            )
        )
    return items


@router.post("/{document_id}/share", response_model=DocumentShareResponse, status_code=201)
async def grant_document_access(
    document_id: str,
    payload: DocumentShareCreate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Grant a user access to a document (owner only)."""
    await get_owned_document_or_404(session, document_id, current_user.id)

    if payload.grantee_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share document with yourself")

    # Check grantee exists
    grantee_result = await session.execute(select(User).where(User.id == payload.grantee_user_id))
    if grantee_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Grantee user not found")

    # Upsert: update if already granted
    existing_result = await session.execute(
        select(DocumentAccessGrant).where(
            DocumentAccessGrant.document_id == document_id,
            DocumentAccessGrant.grantee_user_id == payload.grantee_user_id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        existing.access_level = payload.access_level
        existing.granted_by_user_id = current_user.id
        await session.commit()
        await session.refresh(existing)
        grantee_result = await session.execute(select(User).where(User.id == payload.grantee_user_id))
        grantee = grantee_result.scalar_one_or_none()
        await log_document_activity(
            request,
            event_type="document.permission",
            action="share_update",
            user_id=current_user.id,
            resource_type="document",
            resource_id=document_id,
            status_code=201,
        )
        return DocumentShareResponse(
            document_id=existing.document_id,
            grantee_user_id=existing.grantee_user_id,
            grantee_email=grantee.email if grantee else None,
            grantee_name=grantee.name if grantee else None,
            granted_by_user_id=existing.granted_by_user_id,
            access_level=existing.access_level,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
        )

    grant = DocumentAccessGrant(
        id=str(uuid4()),
        document_id=document_id,
        grantee_user_id=payload.grantee_user_id,
        granted_by_user_id=current_user.id,
        access_level=payload.access_level,
    )
    session.add(grant)
    await session.commit()
    await session.refresh(grant)
    grantee_result = await session.execute(select(User).where(User.id == payload.grantee_user_id))
    grantee = grantee_result.scalar_one_or_none()
    await log_document_activity(
        request,
        event_type="document.permission",
        action="share_grant",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document_id,
        status_code=201,
    )
    return DocumentShareResponse(
        document_id=grant.document_id,
        grantee_user_id=grant.grantee_user_id,
        grantee_email=grantee.email if grantee else None,
        grantee_name=grantee.name if grantee else None,
        granted_by_user_id=grant.granted_by_user_id,
        access_level=grant.access_level,
        created_at=grant.created_at,
        updated_at=grant.updated_at,
    )


@router.delete("/{document_id}/share/{grantee_user_id}", status_code=200)
async def revoke_document_access(
    document_id: str,
    grantee_user_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Revoke a user's access grant (owner only)."""
    await get_owned_document_or_404(session, document_id, current_user.id)
    result = await session.execute(
        select(DocumentAccessGrant).where(
            DocumentAccessGrant.document_id == document_id,
            DocumentAccessGrant.grantee_user_id == grantee_user_id,
        )
    )
    grant = result.scalar_one_or_none()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    await session.delete(grant)
    await session.commit()
    await log_document_activity(
        request,
        event_type="document.permission",
        action="share_revoke",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document_id,
        status_code=200,
    )
    return {"message": "Access revoked"}


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_document_with_access_or_404(session, document_id, current_user.id, require_write=True)

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
    await log_document_activity(
        request,
        event_type="document.lifecycle",
        action="update",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        status_code=200,
    )
    return document


@router.delete("/{document_id}")
async def soft_delete_document(
    document_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_owned_document_or_404(session, document_id, current_user.id)
    document.is_deleted = True
    document.deleted_at = datetime.now(timezone.utc)

    await session.commit()
    await log_document_activity(
        request,
        event_type="document.lifecycle",
        action="soft_delete",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        status_code=200,
    )
    return {"message": "Document moved to recycle bin"}


@router.post("/{document_id}/restore", response_model=DocumentResponse)
async def restore_document(
    document_id: str,
    request: Request,
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
    await log_document_activity(
        request,
        event_type="document.lifecycle",
        action="restore",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        status_code=200,
    )
    return document


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse, status_code=201)
async def create_document_version(
    document_id: str,
    payload: DocumentVersionCreate,
    request: Request,
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
    await log_document_activity(
        request,
        event_type="document.version",
        action="create",
        user_id=current_user.id,
        resource_type="document_version",
        resource_id=version.id,
        status_code=201,
    )
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


@router.post("/{document_id}/versions/{version_id}/restore", response_model=DocumentVersionResponse, status_code=201)
async def restore_document_version(
    document_id: str,
    version_id: str,
    payload: DocumentVersionRestoreRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    document = await get_document_with_access_or_404(session, document_id, current_user.id, require_write=True)
    if document.status == "archived":
        raise HTTPException(status_code=400, detail="Archived document does not accept version restore")

    source_version = await get_document_version_or_404(session, document.id, version_id)
    next_version = await get_next_document_version(session, document.id)
    restore_note = payload.change_note or f"Restored from version {source_version.version_number}"

    version = DocumentVersion(
        id=str(uuid4()),
        document_id=document.id,
        version_number=next_version,
        filename=source_version.filename,
        content_type=source_version.content_type,
        size_bytes=source_version.size_bytes,
        checksum=source_version.checksum,
        bucket_name=source_version.bucket_name,
        object_key=source_version.object_key,
        change_note=restore_note,
        created_by_user_id=current_user.id,
    )
    session.add(version)
    document.bucket_name = source_version.bucket_name
    document.object_key = source_version.object_key

    await session.commit()
    await session.refresh(version)
    await log_document_activity(
        request,
        event_type="document.version",
        action="restore",
        user_id=current_user.id,
        resource_type="document_version",
        resource_id=version.id,
        status_code=201,
    )
    return version


@router.post("/{document_id}/status", response_model=DocumentResponse)
async def change_document_status(
    document_id: str,
    payload: DocumentUpdate,
    request: Request,
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
    await log_document_activity(
        request,
        event_type="document.lifecycle",
        action="status_change",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        status_code=200,
    )
    return document
