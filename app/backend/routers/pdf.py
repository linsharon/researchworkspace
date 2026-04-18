"""
PDF Management Router - Upload, download, and serve PDF files from local uploads directory.
"""
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

# Resolve uploads directory relative to the workspace root
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/v1/pdf", tags=["pdf"])


# ============================================================
# Schemas
# ============================================================

class PDFFileInfo(BaseModel):
    filename: str
    size: int
    uploaded_at: str


class PDFListResponse(BaseModel):
    files: List[PDFFileInfo]


class UploadResponse(BaseModel):
    filename: str
    size: int
    message: str


# ============================================================
# Helpers
# ============================================================

def _safe_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and ensure it is a PDF."""
    # Strip any directory components
    name = Path(filename).name
    # Allow only safe characters: word chars, hyphens, dots, spaces
    name = re.sub(r"[^\w\-. ]", "_", name).strip()
    if not name:
        raise ValueError("Invalid filename")
    if not name.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are allowed")
    # Limit length
    if len(name) > 255:
        name = name[:251] + ".pdf"
    return name


def _resolve_path(filename: str) -> Path:
    """Resolve and validate that the path stays inside UPLOADS_DIR."""
    safe_name = _safe_filename(filename)
    resolved = (UPLOADS_DIR / safe_name).resolve()
    # Guard against path traversal even after sanitization
    if not str(resolved).startswith(str(UPLOADS_DIR.resolve())):
        raise ValueError("Invalid path")
    return resolved


def _looks_like_pdf(content: bytes) -> bool:
    """Best-effort PDF detection.

    Many valid PDFs include leading whitespace/BOM bytes before the "%PDF" header,
    so we scan the first 1KB instead of requiring a strict offset-0 match.
    """
    if not content:
        return False
    header_window = content[:1024]
    return header_window.find(b"%PDF") != -1


# ============================================================
# Endpoints
# ============================================================

@router.get("/list", response_model=PDFListResponse)
async def list_pdfs(
    _current_user: UserResponse = Depends(get_current_user),
):
    """List all PDF files in the uploads directory."""
    files: List[PDFFileInfo] = []
    if UPLOADS_DIR.exists():
        for f in sorted(UPLOADS_DIR.glob("*.pdf")):
            stat = f.stat()
            files.append(
                PDFFileInfo(
                    filename=f.name,
                    size=stat.st_size,
                    uploaded_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                )
            )
    return PDFListResponse(files=files)


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile = File(...),
    _current_user: UserResponse = Depends(get_current_user),
):
    """Upload a PDF file to the uploads directory."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    try:
        safe_name = _safe_filename(file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()

    # Validate PDF magic bytes
    if not _looks_like_pdf(content):
        raise HTTPException(status_code=400, detail="File does not appear to be a valid PDF")

    dest = UPLOADS_DIR / safe_name
    with open(dest, "wb") as f:
        f.write(content)

    logger.info(f"PDF uploaded: {safe_name} ({len(content)} bytes)")
    return UploadResponse(filename=safe_name, size=len(content), message="Upload successful")


@router.get("/download/{filename}")
async def download_pdf(
    filename: str,
    _current_user: UserResponse = Depends(get_current_user),
):
    """Download a PDF file as an attachment."""
    try:
        file_path = _resolve_path(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_path.name}"'},
    )


@router.get("/view/{filename}")
async def view_pdf(
    filename: str,
    _current_user: UserResponse = Depends(get_current_user),
):
    """Serve a PDF file inline so the browser can display it."""
    try:
        file_path = _resolve_path(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{file_path.name}"'},
    )


@router.delete("/delete/{filename}")
async def delete_pdf(
    filename: str,
    _current_user: UserResponse = Depends(get_current_user),
):
    """Delete a PDF file from the uploads directory."""
    try:
        file_path = _resolve_path(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_path.unlink()
    logger.info(f"PDF deleted: {filename}")
    return {"success": True, "message": f"{file_path.name} deleted"}
