"""CivicFix Plot & Municipal Portal Router for BuildWise (Live Real-Time Integration)."""

import os
import shutil
import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.routers.auth import get_current_user
from backend.app.services.civicfix_service import CivicFixService

router = APIRouter(prefix="/api/civic", tags=["CivicFix Municipal Portal"])

# Locate the uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm"}


class CreatePlotComplaintPayload(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    category: str = Field(default="Roads & Infrastructure")
    location: str = Field(..., min_length=3, max_length=255)
    priority: str = Field(default="Medium")
    image_url: Optional[str] = None
    project_id: Optional[str] = None


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_evidence_media(
    request: Request,
    file: UploadFile = File(...),
    ticket_id: Optional[str] = Form(None),
) -> dict[str, Any]:
    """Receives evidence photos/videos directly from CivicFix /api/external/send-image.

    Accepts multipart/form-data:
      - file: Binary image or video file
      - ticket_id: (Optional) Ticket ID to associate with the uploaded image
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed extensions: JPG, JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM.",
        )

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    base = str(request.base_url).rstrip("/")
    # Handle HTTPS proxies (like Render)
    if request.headers.get("x-forwarded-proto") == "https" and base.startswith("http://"):
        base = base.replace("http://", "https://", 1)

    file_url = f"{base}/uploads/{unique_filename}"

    return {
        "status": "success",
        "message": "File received and stored successfully on BuildWise server",
        "filename": unique_filename,
        "file_url": file_url,
        "ticket_id": ticket_id,
        "media_type": "video" if ext in {".mp4", ".mov", ".webm"} else "image",
    }


@router.get("/uploads")
async def list_received_uploads(request: Request) -> dict[str, Any]:
    """Returns a list of all files received on BuildWise server with preview URLs."""
    if not os.path.exists(UPLOAD_DIR):
        return {"files": [], "count": 0}

    base = str(request.base_url).rstrip("/")
    if request.headers.get("x-forwarded-proto") == "https" and base.startswith("http://"):
        base = base.replace("http://", "https://", 1)

    items = []
    for fname in sorted(os.listdir(UPLOAD_DIR), reverse=True):
        if fname.startswith("."):
            continue
        fpath = os.path.join(UPLOAD_DIR, fname)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            ext = os.path.splitext(fname)[1].lower()
            items.append({
                "filename": fname,
                "file_url": f"{base}/uploads/{fname}",
                "size_bytes": stat.st_size,
                "media_type": "video" if ext in {".mp4", ".mov", ".webm"} else "image",
                "modified_at": stat.st_mtime,
            })

    return {"files": items, "count": len(items)}


@router.get("/overview")
async def get_civic_overview(
    location: Optional[str] = Query(None, description="Plot location or ward name"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Returns 100% real infrastructure health score, active issues, and municipal departments from CivicFix."""
    service = CivicFixService(db)
    return await service.get_plot_overview(location_query=location)


@router.get("/complaints")
async def list_plot_complaints(
    location: Optional[str] = Query(None, description="Filter by plot location"),
    status_filter: Optional[str] = Query(None, description="Filter by status: Submitted, In Progress, Resolved"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Lists real live complaints directly from CivicFix for the plot area."""
    service = CivicFixService(db)
    res = await service.get_complaints_for_area(location_query=location)
    items = res.get("complaints", [])

    if status_filter and status_filter.lower() != "all":
        items = [c for c in items if str(c.get("status", "")).lower() == status_filter.lower()]

    return {
        "connected": res.get("connected", False),
        "count": len(items),
        "complaints": items,
    }


@router.post("/complaints", status_code=status.HTTP_201_CREATED)
async def submit_plot_complaint(
    payload: CreatePlotComplaintPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Submits a real civic hazard/complaint directly into the CivicFix platform."""
    service = CivicFixService(db)
    user_id = current_user.id if current_user else None

    try:
        result = await service.file_complaint(
            payload=payload.model_dump(),
            user_id=user_id,
            project_id=payload.project_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to forward complaint to CivicFix: {e}",
        )

    ticket_id = result.get("ticket_id", "CF-PENDING")
    assigned_dept = result.get("department_name") or "Municipal Works Dept"

    return {
        "status": "success",
        "message": f"Real complaint registered in CivicFix under ticket {ticket_id}. Dispatched to {assigned_dept}.",
        "complaint": result,
    }


@router.get("/complaints/{ticket_id}")
async def get_complaint_status(
    ticket_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieves real-time progress and signed resolution notes from CivicFix for a specific ticket."""
    service = CivicFixService(db)
    complaint = await service.get_complaint_by_ticket(ticket_id)

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CivicFix ticket '{ticket_id}' not found in live system.",
        )

    return {"complaint": complaint}
