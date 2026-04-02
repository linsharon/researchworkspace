"""Manuscript API router - papers, notes, highlights, concepts management."""

from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import db_manager
from dependencies.database import get_db
from models.manuscript import Paper, Note, Highlight, Concept, Project

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


class ConceptResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    definition: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ============================================================
# Router
# ============================================================

router = APIRouter(prefix="/api/v1/manuscripts", tags=["manuscripts"])


# --- Papers ---

@router.post("/papers", response_model=PaperResponse)
async def create_paper(paper: PaperCreate, session: AsyncSession = Depends(get_db)):
    """Create a new paper"""
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
):
    """List all papers for a project"""
    result = await session.execute(
        select(Paper).where(Paper.project_id == project_id)
    )
    papers = result.scalars().all()
    return papers


@router.get("/papers/entry-papers", response_model=List[PaperResponse])
async def list_entry_papers(
    project_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
):
    """List entry papers and expanded papers for reading"""
    result = await session.execute(
        select(Paper).where(
            (Paper.project_id == project_id)
            & ((Paper.is_entry_paper == True) | (Paper.is_expanded_paper == True))
        )
    )
    papers = result.scalars().all()
    return papers


@router.get("/papers/{paper_id}", response_model=PaperResponse)
async def get_paper(paper_id: str, session: AsyncSession = Depends(get_db)):
    """Get a specific paper"""
    result = await session.execute(
        select(Paper).where(Paper.id == paper_id)
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.put("/papers/{paper_id}", response_model=PaperResponse)
async def update_paper(
    paper_id: str,
    paper_update: PaperUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Update a paper"""
    result = await session.execute(
        select(Paper).where(Paper.id == paper_id)
    )
    db_paper = result.scalar_one_or_none()
    if not db_paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    update_data = paper_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_paper, key, value)
    
    await session.commit()
    await session.refresh(db_paper)
    return db_paper


@router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: str, session: AsyncSession = Depends(get_db)):
    """Delete a paper"""
    result = await session.execute(
        select(Paper).where(Paper.id == paper_id)
    )
    db_paper = result.scalar_one_or_none()
    if not db_paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    await session.delete(db_paper)
    await session.commit()
    return {"message": "Paper deleted"}


# --- Notes ---

@router.post("/notes", response_model=NoteResponse)
async def create_note(note: NoteCreate, session: AsyncSession = Depends(get_db)):
    """Create a new note"""
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
):
    """List notes for a paper or project."""
    query = select(Note)
    if paper_id:
        query = query.where(Note.paper_id == paper_id)
    if project_id:
        query = query.where(Note.project_id == project_id)

    query = query.order_by(Note.updated_at.desc(), Note.created_at.desc())
    result = await session.execute(query)
    notes = result.scalars().all()
    return notes


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, session: AsyncSession = Depends(get_db)):
    """Get a specific note"""
    result = await session.execute(
        select(Note).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Update a note"""
    result = await session.execute(
        select(Note).where(Note.id == note_id)
    )
    db_note = result.scalar_one_or_none()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)
    
    await session.commit()
    await session.refresh(db_note)
    return db_note


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, session: AsyncSession = Depends(get_db)):
    """Delete a note"""
    result = await session.execute(
        select(Note).where(Note.id == note_id)
    )
    db_note = result.scalar_one_or_none()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    await session.delete(db_note)
    await session.commit()
    return {"message": "Note deleted"}


# --- Highlights ---

@router.post("/highlights", response_model=HighlightResponse)
async def create_highlight(
    highlight: HighlightCreate,
    session: AsyncSession = Depends(get_db),
):
    """Create a new highlight"""
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
):
    """List all highlights for a paper"""
    result = await session.execute(
        select(Highlight).where(Highlight.paper_id == paper_id)
    )
    highlights = result.scalars().all()
    return highlights


@router.delete("/highlights/{highlight_id}")
async def delete_highlight(highlight_id: str, session: AsyncSession = Depends(get_db)):
    """Delete a highlight"""
    result = await session.execute(
        select(Highlight).where(Highlight.id == highlight_id)
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
):
    """Create a new concept"""
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
):
    """List all concepts for a project"""
    result = await session.execute(
        select(Concept).where(Concept.project_id == project_id)
    )
    concepts = result.scalars().all()
    return concepts


# --- Projects ---

@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    session: AsyncSession = Depends(get_db),
):
    """Create a new project (or upsert if id already exists)"""
    project_id = project.id or str(uuid4())
    existing = await session.get(Project, project_id)
    if existing:
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
        title=project.title,
        description=project.description,
    )
    session.add(db_project)
    await session.commit()
    await session.refresh(db_project)
    return db_project


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(session: AsyncSession = Depends(get_db)):
    """List all projects"""
    result = await session.execute(select(Project))
    return result.scalars().all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, session: AsyncSession = Depends(get_db)):
    """Get a specific project"""
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Update a project"""
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    await session.commit()
    await session.refresh(project)
    return project
