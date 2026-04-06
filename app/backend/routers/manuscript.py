"""Manuscript API router - papers, notes, highlights, concepts management."""

from typing import List, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import db_manager
from dependencies.auth import get_current_user
from dependencies.database import get_db
from models.auth import User
from models.manuscript import Concept, Highlight, Note, Paper, Project, ProjectMember, SearchRecord
from schemas.auth import UserResponse
from services.activity import log_activity_event

# ============================================================
# Pydantic Schemas
# ============================================================

class PaperCreate(BaseModel):
    title: str
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    journal: Optional[str] = None
    abstract: Optional[str] = None
    url: Optional[str] = None
    discovery_path: Optional[str] = None
    discovery_note: Optional[str] = None
    project_id: str


class PaperUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    journal: Optional[str] = None
    abstract: Optional[str] = None
    url: Optional[str] = None
    is_entry_paper: Optional[bool] = None
    is_expanded_paper: Optional[bool] = None
    reading_status: Optional[str] = None
    relevance: Optional[str] = None
    discovery_path: Optional[str] = None
    discovery_note: Optional[str] = None
    pdf_path: Optional[str] = None


class PaperResponse(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: Optional[int]
    journal: Optional[str]
    abstract: Optional[str]
    url: Optional[str]
    is_entry_paper: bool
    is_expanded_paper: bool
    reading_status: str
    relevance: Optional[str]
    discovery_path: Optional[str]
    discovery_note: Optional[str]
    pdf_path: Optional[str]
    project_id: str

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    id: Optional[str] = None  # allow client to supply id (for upsert with known id)
    title: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    created_at: str
    updated_at: str

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


ProjectMemberRole = Literal["viewer", "editor"]


class ProjectMemberCreate(BaseModel):
    user_id: str
    role: ProjectMemberRole = "viewer"


class ProjectMemberUpdate(BaseModel):
    role: ProjectMemberRole


class ProjectMemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: ProjectMemberRole
    added_by_user_id: str
    created_at: str
    updated_at: str

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def convert_member_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value


class NoteCreate(BaseModel):
    paper_id: str
    title: str
    description: Optional[str] = None
    note_type: str  # "literature-note" or "permanent-note"
    page: Optional[int] = None
    keywords: List[str] = Field(default_factory=list)
    citations: List[str] = Field(default_factory=list)  # Paper IDs
    content: Optional[str] = None
    project_id: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    page: Optional[int] = None
    keywords: Optional[List[str]] = None
    citations: Optional[List[str]] = None
    content: Optional[str] = None


class NoteResponse(BaseModel):
    id: str
    paper_id: str
    project_id: str
    title: str
    description: Optional[str]
    note_type: str
    page: Optional[int]
    keywords: List[str]
    citations: List[str]
    content: Optional[str]
    created_at: str
    updated_at: str

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


class HighlightCreate(BaseModel):
    paper_id: str
    text: str
    page: Optional[int] = None
    color: str = "yellow"
    note: Optional[str] = None


class HighlightResponse(BaseModel):
    id: str
    paper_id: str
    text: str
    page: Optional[int]
    color: str
    note: Optional[str]
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


class ConceptCreate(BaseModel):
    title: str
    description: Optional[str] = None
    definition: Optional[str] = None
    project_id: str


class ConceptUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    definition: Optional[str] = None


class ConceptResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    definition: Optional[str]
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


class SearchRecordCreate(BaseModel):
    project_id: str
    database: str
    query: str
    results: int = 0
    relevant: int = 0


class SearchRecordUpdate(BaseModel):
    database: Optional[str] = None
    query: Optional[str] = None
    results: Optional[int] = None
    relevant: Optional[int] = None


class SearchRecordResponse(BaseModel):
    id: str
    project_id: str
    database: str
    query: str
    results: int
    relevant: int
    searched_at: str

    @field_validator("searched_at", mode="before")
    @classmethod
    def convert_datetime(cls, value):
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True


# ============================================================
# Router
# ============================================================

router = APIRouter(prefix="/api/v1/manuscripts", tags=["manuscripts"])


async def get_owned_project_or_404(session: AsyncSession, project_id: str, user_id: str) -> Project:
    """Fetch a project only if it belongs to the current user."""
    result = await session.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Backfill legacy demo projects created before ownership enforcement.
    if not project.owner_user_id:
        project.owner_user_id = user_id
        await session.commit()
        await session.refresh(project)
        return project

    if project.owner_user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


def project_read_condition(user_id: str):
    member_exists = (
        select(ProjectMember.id)
        .where(
            ProjectMember.project_id == Project.id,
            ProjectMember.user_id == user_id,
        )
        .exists()
    )
    return or_(Project.owner_user_id == user_id, member_exists)


def project_write_condition(user_id: str):
    editor_exists = (
        select(ProjectMember.id)
        .where(
            ProjectMember.project_id == Project.id,
            ProjectMember.user_id == user_id,
            ProjectMember.role == "editor",
        )
        .exists()
    )
    return or_(Project.owner_user_id == user_id, editor_exists)


async def get_project_with_access_or_404(
    session: AsyncSession,
    project_id: str,
    user_id: str,
    require_write: bool = False,
) -> Project:
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.owner_user_id:
        project.owner_user_id = user_id
        await session.commit()
        await session.refresh(project)
        return project

    if project.owner_user_id == user_id:
        return project

    member_result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Project not found")
    if require_write and member.role != "editor":
        raise HTTPException(status_code=403, detail="Project is read-only for current member role")
    return project


async def build_project_member_response(session: AsyncSession, member: ProjectMember) -> ProjectMemberResponse:
    user_result = await session.execute(select(User).where(User.id == member.user_id))
    user = user_result.scalar_one_or_none()
    return ProjectMemberResponse(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        email=user.email if user else None,
        name=user.name if user else None,
        role=member.role,
        added_by_user_id=member.added_by_user_id,
        created_at=member.created_at,
        updated_at=member.updated_at,
    )


def _to_audit_value(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def serialize_paper_for_audit(paper: Paper) -> dict:
    return {
        "id": paper.id,
        "project_id": paper.project_id,
        "title": paper.title,
        "authors": paper.authors,
        "year": paper.year,
        "journal": paper.journal,
        "abstract": paper.abstract,
        "url": paper.url,
        "pdf_path": paper.pdf_path,
        "discovery_path": paper.discovery_path,
        "discovery_note": paper.discovery_note,
        "is_entry_paper": paper.is_entry_paper,
        "is_expanded_paper": paper.is_expanded_paper,
        "reading_status": paper.reading_status,
        "relevance": paper.relevance,
        "created_at": _to_audit_value(paper.created_at),
        "updated_at": _to_audit_value(paper.updated_at),
    }


def serialize_note_for_audit(note: Note) -> dict:
    return {
        "id": note.id,
        "paper_id": note.paper_id,
        "project_id": note.project_id,
        "title": note.title,
        "description": note.description,
        "note_type": note.note_type,
        "page": note.page,
        "keywords": note.keywords,
        "citations": note.citations,
        "content": note.content,
        "created_at": _to_audit_value(note.created_at),
        "updated_at": _to_audit_value(note.updated_at),
    }


def serialize_concept_for_audit(concept: Concept) -> dict:
    return {
        "id": concept.id,
        "project_id": concept.project_id,
        "title": concept.title,
        "description": concept.description,
        "definition": concept.definition,
        "created_at": _to_audit_value(concept.created_at),
        "updated_at": _to_audit_value(concept.updated_at),
    }


async def record_manuscript_write_activity(
    *,
    request: Request,
    current_user: UserResponse,
    action: str,
    resource_type: str,
    resource_id: str,
    project_id: str,
    before: Optional[dict],
    after: Optional[dict],
    changed_fields: Optional[list[str]] = None,
) -> None:
    details = {
        "project_id": project_id,
        "before": before,
        "after": after,
    }
    if changed_fields is not None:
        details["changed_fields"] = changed_fields

    await log_activity_event(
        event_type="manuscript.write",
        action=action,
        path=request.url.path,
        status_code=200,
        user_id=current_user.id,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        request_id=getattr(request.state, "request_id", None),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        error_type=None,
        duration_ms=None,
    )


# --- Papers ---

@router.post("/papers", response_model=PaperResponse)
async def create_paper(
    paper: PaperCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new paper"""
    await get_project_with_access_or_404(session, paper.project_id, current_user.id, require_write=True)
    db_paper = Paper(
        id=str(uuid4()),
        title=paper.title,
        authors=paper.authors,
        year=paper.year,
        journal=paper.journal,
        abstract=paper.abstract,
        url=paper.url,
        discovery_path=paper.discovery_path,
        discovery_note=paper.discovery_note,
        project_id=paper.project_id,
        reading_status="To Read",
    )
    session.add(db_paper)
    await session.commit()
    await session.refresh(db_paper)
    return db_paper


@router.get("/papers", response_model=List[PaperResponse])
async def list_papers(
    project_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all papers for a project"""
    await get_project_with_access_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(Paper).where(Paper.project_id == project_id)
    )
    papers = result.scalars().all()
    return papers


@router.get("/papers/entry-papers", response_model=List[PaperResponse])
async def list_entry_papers(
    project_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List entry papers and expanded papers for reading"""
    await get_project_with_access_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(Paper).where(
            (Paper.project_id == project_id)
            & ((Paper.is_entry_paper == True) | (Paper.is_expanded_paper == True))
        )
    )
    papers = result.scalars().all()
    return papers


@router.get("/papers/{paper_id}", response_model=PaperResponse)
async def get_paper(
    paper_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a specific paper"""
    result = await session.execute(
        select(Paper)
        .join(Project, Paper.project_id == Project.id)
        .where(Paper.id == paper_id, project_read_condition(current_user.id))
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.put("/papers/{paper_id}", response_model=PaperResponse)
async def update_paper(
    paper_id: str,
    paper_update: PaperUpdate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a paper"""
    result = await session.execute(
        select(Paper)
        .join(Project, Paper.project_id == Project.id)
        .where(Paper.id == paper_id, project_write_condition(current_user.id))
    )
    db_paper = result.scalar_one_or_none()
    if not db_paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    before = serialize_paper_for_audit(db_paper)
    update_data = paper_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_paper, key, value)

    await session.commit()
    await session.refresh(db_paper)
    await record_manuscript_write_activity(
        request=request,
        current_user=current_user,
        action="paper_update",
        resource_type="paper",
        resource_id=db_paper.id,
        project_id=db_paper.project_id,
        before=before,
        after=serialize_paper_for_audit(db_paper),
        changed_fields=sorted(update_data.keys()),
    )
    return db_paper


@router.delete("/papers/{paper_id}")
async def delete_paper(
    paper_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a paper"""
    result = await session.execute(
        select(Paper)
        .join(Project, Paper.project_id == Project.id)
        .where(Paper.id == paper_id, project_write_condition(current_user.id))
    )
    db_paper = result.scalar_one_or_none()
    if not db_paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    before = serialize_paper_for_audit(db_paper)
    await session.delete(db_paper)
    await session.commit()
    await record_manuscript_write_activity(
        request=request,
        current_user=current_user,
        action="paper_delete",
        resource_type="paper",
        resource_id=paper_id,
        project_id=before["project_id"],
        before=before,
        after=None,
    )
    return {"message": "Paper deleted"}


# --- Notes ---

@router.post("/notes", response_model=NoteResponse)
async def create_note(
    note: NoteCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new note"""
    await get_project_with_access_or_404(session, note.project_id, current_user.id, require_write=True)

    paper_result = await session.execute(
        select(Paper).where(Paper.id == note.paper_id, Paper.project_id == note.project_id)
    )
    paper = paper_result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    db_note = Note(
        id=str(uuid4()),
        paper_id=note.paper_id,
        project_id=note.project_id,
        title=note.title,
        description=note.description,
        note_type=note.note_type,
        page=note.page,
        keywords=note.keywords,
        citations=note.citations,
        content=note.content,
    )
    session.add(db_note)
    await session.commit()
    await session.refresh(db_note)
    return db_note


@router.get("/notes", response_model=List[NoteResponse])
async def list_notes(
    paper_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List notes for a paper or project."""
    query = select(Note).join(Project, Note.project_id == Project.id).where(project_read_condition(current_user.id))
    if paper_id:
        query = query.where(Note.paper_id == paper_id)
    if project_id:
        query = query.where(Note.project_id == project_id)

    query = query.order_by(Note.updated_at.desc(), Note.created_at.desc())
    result = await session.execute(query)
    notes = result.scalars().all()
    return notes


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a specific note"""
    result = await session.execute(
        select(Note)
        .join(Project, Note.project_id == Project.id)
        .where(Note.id == note_id, project_read_condition(current_user.id))
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a note"""
    result = await session.execute(
        select(Note)
        .join(Project, Note.project_id == Project.id)
        .where(Note.id == note_id, project_write_condition(current_user.id))
    )
    db_note = result.scalar_one_or_none()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    before = serialize_note_for_audit(db_note)
    update_data = note_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)

    await session.commit()
    await session.refresh(db_note)
    await record_manuscript_write_activity(
        request=request,
        current_user=current_user,
        action="note_update",
        resource_type="note",
        resource_id=db_note.id,
        project_id=db_note.project_id,
        before=before,
        after=serialize_note_for_audit(db_note),
        changed_fields=sorted(update_data.keys()),
    )
    return db_note


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a note"""
    result = await session.execute(
        select(Note)
        .join(Project, Note.project_id == Project.id)
        .where(Note.id == note_id, project_write_condition(current_user.id))
    )
    db_note = result.scalar_one_or_none()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    before = serialize_note_for_audit(db_note)
    await session.delete(db_note)
    await session.commit()
    await record_manuscript_write_activity(
        request=request,
        current_user=current_user,
        action="note_delete",
        resource_type="note",
        resource_id=note_id,
        project_id=before["project_id"],
        before=before,
        after=None,
    )
    return {"message": "Note deleted"}


# --- Highlights ---

@router.post("/highlights", response_model=HighlightResponse)
async def create_highlight(
    highlight: HighlightCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new highlight"""
    paper_result = await session.execute(
        select(Paper)
        .join(Project, Paper.project_id == Project.id)
        .where(Paper.id == highlight.paper_id, project_write_condition(current_user.id))
    )
    paper = paper_result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    db_highlight = Highlight(
        id=str(uuid4()),
        paper_id=highlight.paper_id,
        text=highlight.text,
        page=highlight.page,
        color=highlight.color,
        note=highlight.note,
    )
    session.add(db_highlight)
    await session.commit()
    await session.refresh(db_highlight)
    return db_highlight


@router.get("/highlights", response_model=List[HighlightResponse])
async def list_highlights(
    paper_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all highlights for a paper"""
    result = await session.execute(
        select(Highlight)
        .join(Paper, Highlight.paper_id == Paper.id)
        .join(Project, Paper.project_id == Project.id)
        .where(Highlight.paper_id == paper_id, project_read_condition(current_user.id))
    )
    highlights = result.scalars().all()
    return highlights


@router.delete("/highlights/{highlight_id}")
async def delete_highlight(
    highlight_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a highlight"""
    result = await session.execute(
        select(Highlight)
        .join(Paper, Highlight.paper_id == Paper.id)
        .join(Project, Paper.project_id == Project.id)
        .where(Highlight.id == highlight_id, project_write_condition(current_user.id))
    )
    db_highlight = result.scalar_one_or_none()
    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    await session.delete(db_highlight)
    await session.commit()
    return {"message": "Highlight deleted"}


# --- Concepts ---

@router.post("/concepts", response_model=ConceptResponse)
async def create_concept(
    concept: ConceptCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new concept"""
    await get_project_with_access_or_404(session, concept.project_id, current_user.id, require_write=True)
    db_concept = Concept(
        id=str(uuid4()),
        project_id=concept.project_id,
        title=concept.title,
        description=concept.description,
        definition=concept.definition,
    )
    session.add(db_concept)
    await session.commit()
    await session.refresh(db_concept)
    return db_concept


@router.get("/concepts", response_model=List[ConceptResponse])
async def list_concepts(
    project_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all concepts for a project"""
    await get_project_with_access_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(Concept).where(Concept.project_id == project_id)
    )
    concepts = result.scalars().all()
    return concepts


@router.put("/concepts/{concept_id}", response_model=ConceptResponse)
async def update_concept(
    concept_id: str,
    concept_update: ConceptUpdate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a concept"""
    result = await session.execute(
        select(Concept)
        .join(Project, Concept.project_id == Project.id)
        .where(Concept.id == concept_id, project_write_condition(current_user.id))
    )
    db_concept = result.scalar_one_or_none()
    if not db_concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    before = serialize_concept_for_audit(db_concept)
    update_data = concept_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_concept, key, value)

    await session.commit()
    await session.refresh(db_concept)
    await record_manuscript_write_activity(
        request=request,
        current_user=current_user,
        action="concept_update",
        resource_type="concept",
        resource_id=db_concept.id,
        project_id=db_concept.project_id,
        before=before,
        after=serialize_concept_for_audit(db_concept),
        changed_fields=sorted(update_data.keys()),
    )
    return db_concept


@router.delete("/concepts/{concept_id}")
async def delete_concept(
    concept_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a concept"""
    result = await session.execute(
        select(Concept)
        .join(Project, Concept.project_id == Project.id)
        .where(Concept.id == concept_id, project_write_condition(current_user.id))
    )
    db_concept = result.scalar_one_or_none()
    if not db_concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    before = serialize_concept_for_audit(db_concept)
    await session.delete(db_concept)
    await session.commit()
    await record_manuscript_write_activity(
        request=request,
        current_user=current_user,
        action="concept_delete",
        resource_type="concept",
        resource_id=concept_id,
        project_id=before["project_id"],
        before=before,
        after=None,
    )
    return {"message": "Concept deleted"}


# --- Search Records ---

@router.post("/search-records", response_model=SearchRecordResponse, status_code=201)
async def create_search_record(
    payload: SearchRecordCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a search record"""
    await get_project_with_access_or_404(session, payload.project_id, current_user.id, require_write=True)
    record = SearchRecord(
        id=str(uuid4()),
        project_id=payload.project_id,
        database=payload.database,
        query=payload.query,
        results=payload.results,
        relevant=payload.relevant,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/search-records", response_model=List[SearchRecordResponse])
async def list_search_records(
    project_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List search records for a project"""
    await get_project_with_access_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(SearchRecord)
        .where(SearchRecord.project_id == project_id)
        .order_by(SearchRecord.searched_at.desc(), SearchRecord.created_at.desc())
    )
    return result.scalars().all()


@router.put("/search-records/{record_id}", response_model=SearchRecordResponse)
async def update_search_record(
    record_id: str,
    payload: SearchRecordUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a search record"""
    result = await session.execute(
        select(SearchRecord)
        .join(Project, SearchRecord.project_id == Project.id)
        .where(SearchRecord.id == record_id, project_write_condition(current_user.id))
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Search record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    await session.commit()
    await session.refresh(record)
    return record


@router.delete("/search-records/{record_id}")
async def delete_search_record(
    record_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a search record"""
    result = await session.execute(
        select(SearchRecord)
        .join(Project, SearchRecord.project_id == Project.id)
        .where(SearchRecord.id == record_id, project_write_condition(current_user.id))
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Search record not found")

    await session.delete(record)
    await session.commit()
    return {"message": "Search record deleted"}


# --- Projects ---

@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new project (or upsert if id already exists)"""
    project_id = project.id or str(uuid4())
    existing = await session.get(Project, project_id)
    if existing:
        if not existing.owner_user_id:
            existing.owner_user_id = current_user.id
        elif existing.owner_user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Project not found")
        # Update title/description if provided
        if project.title:
            existing.title = project.title
        if project.description is not None:
            existing.description = project.description
        await session.commit()
        await session.refresh(existing)
        return existing
    db_project = Project(
        id=project_id,
        owner_user_id=current_user.id,
        title=project.title,
        description=project.description,
    )
    session.add(db_project)
    await session.commit()
    await session.refresh(db_project)
    return db_project


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all projects"""
    result = await session.execute(
        select(Project)
        .where(project_read_condition(current_user.id))
        .order_by(Project.updated_at.desc(), Project.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a specific project"""
    project = await get_project_with_access_or_404(session, project_id, current_user.id)
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a project"""
    project = await get_project_with_access_or_404(session, project_id, current_user.id, require_write=True)
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    await session.commit()
    await session.refresh(project)
    return project


@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberResponse])
async def list_project_members(
    project_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    project = await get_owned_project_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(ProjectMember)
        .where(ProjectMember.project_id == project.id)
        .order_by(ProjectMember.created_at.asc())
    )
    members = result.scalars().all()
    return [await build_project_member_response(session, member) for member in members]


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse, status_code=201)
async def add_project_member(
    project_id: str,
    payload: ProjectMemberCreate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    project = await get_owned_project_or_404(session, project_id, current_user.id)
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Project owner is already an implicit member")

    user_result = await session.execute(select(User).where(User.id == payload.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing_result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == payload.user_id,
        )
    )
    member = existing_result.scalar_one_or_none()
    previous_role = member.role if member else None
    created = False

    if member:
        member.role = payload.role
        member.added_by_user_id = current_user.id
    else:
        member = ProjectMember(
            id=str(uuid4()),
            project_id=project.id,
            user_id=payload.user_id,
            role=payload.role,
            added_by_user_id=current_user.id,
        )
        session.add(member)
        created = True

    await session.commit()
    await session.refresh(member)
    await log_activity_event(
        event_type="project.permission",
        action="member_grant" if created else "member_update",
        path=request.url.path,
        status_code=201,
        user_id=current_user.id,
        resource_type="project",
        resource_id=project.id,
        details={
            "member_user_id": payload.user_id,
            "role": payload.role,
            "previous_role": previous_role,
        },
        request_id=getattr(request.state, "request_id", None),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        error_type=None,
        duration_ms=None,
    )
    return await build_project_member_response(session, member)


@router.patch("/projects/{project_id}/members/{member_user_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: str,
    member_user_id: str,
    payload: ProjectMemberUpdate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    project = await get_owned_project_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == member_user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    previous_role = member.role
    member.role = payload.role
    member.added_by_user_id = current_user.id
    await session.commit()
    await session.refresh(member)
    await log_activity_event(
        event_type="project.permission",
        action="member_update",
        path=request.url.path,
        status_code=200,
        user_id=current_user.id,
        resource_type="project",
        resource_id=project.id,
        details={
            "member_user_id": member_user_id,
            "previous_role": previous_role,
            "role": payload.role,
        },
        request_id=getattr(request.state, "request_id", None),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        error_type=None,
        duration_ms=None,
    )
    return await build_project_member_response(session, member)


@router.delete("/projects/{project_id}/members/{member_user_id}")
async def remove_project_member(
    project_id: str,
    member_user_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    project = await get_owned_project_or_404(session, project_id, current_user.id)
    result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == member_user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    removed_role = member.role
    await session.delete(member)
    await session.commit()
    await log_activity_event(
        event_type="project.permission",
        action="member_revoke",
        path=request.url.path,
        status_code=200,
        user_id=current_user.id,
        resource_type="project",
        resource_id=project.id,
        details={
            "member_user_id": member_user_id,
            "removed_role": removed_role,
        },
        request_id=getattr(request.state, "request_id", None),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        error_type=None,
        duration_ms=None,
    )
    return {"message": "Project member removed"}
