"""Manuscript and related data models for paper management system."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from models.base import Base


class Project(Base):
    """Project model for grouping papers, notes, and concepts."""

    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    papers = relationship("Paper", back_populates="project", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="project", cascade="all, delete-orphan")
    concepts = relationship("Concept", back_populates="project", cascade="all, delete-orphan")


class Paper(Base):
    """Paper/manuscript model."""

    __tablename__ = "papers"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    authors = Column(JSON, nullable=False, default=list)
    year = Column(Integer, nullable=True)
    journal = Column(String(255), nullable=True)
    abstract = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    discovery_path = Column(String(255), nullable=True)
    discovery_note = Column(Text, nullable=True)
    is_entry_paper = Column(Boolean, nullable=False, default=False)
    is_expanded_paper = Column(Boolean, nullable=False, default=False)
    reading_status = Column(String(20), nullable=False, default="To Read")
    relevance = Column(String(20), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="papers")
    notes = relationship("Note", back_populates="paper", cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="paper", cascade="all, delete-orphan")


class Note(Base):
    """Literature notes and permanent notes model."""

    __tablename__ = "notes"

    id = Column(String(36), primary_key=True, index=True)
    paper_id = Column(String(36), ForeignKey("papers.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    note_type = Column(String(50), nullable=False)
    page = Column(Integer, nullable=True)
    keywords = Column(JSON, nullable=False, default=list)
    citations = Column(JSON, nullable=False, default=list)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    paper = relationship("Paper", back_populates="notes")
    project = relationship("Project", back_populates="notes")


class Highlight(Base):
    """Text highlights from PDF."""

    __tablename__ = "highlights"

    id = Column(String(36), primary_key=True, index=True)
    paper_id = Column(String(36), ForeignKey("papers.id"), nullable=False)
    text = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    color = Column(String(20), nullable=False, default="yellow")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper", back_populates="highlights")


class Concept(Base):
    """Concepts extracted from papers and notes."""

    __tablename__ = "concepts"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    definition = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="concepts")
