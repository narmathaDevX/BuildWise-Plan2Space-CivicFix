"""CivicFix Plot & Municipal Portal Router for BuildWise."""

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.routers.auth import get_current_user
from backend.app.services.civicfix_service import CivicFixService

router = APIRouter(prefix="/api/civic", tags=["CivicFix Municipal Portal"])


class CreatePlotComplaintPayload(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    category: str = Field(default="Roads & Footpaths")
    location: str = Field(..., min_length=3, max_length=255)
    priority: str = Field(default="Medium")
    image_url: Optional[str] = None
    project_id: Optional[str] = None


@router.get("/overview")
def get_civic_overview(
    location: Optional[str] = Query(None, description="Plot location or ward name"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Returns infrastructure health score, active issues, and municipal departments for an area."""
    service = CivicFixService(db)
    return service.get_plot_overview(location_query=location)


@router.get("/complaints")
def list_plot_complaints(
    location: Optional[str] = Query(None, description="Filter by plot location"),
    status_filter: Optional[str] = Query(None, description="Filter by status: Submitted, In Progress, Resolved"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Lists past and current complaints for the plot area."""
    service = CivicFixService(db)
    items = service.get_complaints_for_area(location_query=location)

    if status_filter and status_filter.lower() != "all":
        items = [c for c in items if c.get("status", "").lower() == status_filter.lower()]

    return {
        "count": len(items),
        "complaints": items,
    }


@router.post("/complaints", status_code=status.HTTP_201_CREATED)
async def submit_plot_complaint(
    payload: CreatePlotComplaintPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Submits a new civic hazard/complaint for the plot and forwards to CivicFix."""
    service = CivicFixService(db)
    user_id = current_user.id if current_user else None

    result = await service.file_complaint(
        payload=payload.model_dump(),
        user_id=user_id,
        project_id=payload.project_id,
    )
    return {
        "status": "success",
        "message": f"Complaint registered under ticket {result['ticket_id']}. Forwarded to {result['assigned_department']}.",
        "complaint": result,
    }


@router.get("/complaints/{ticket_id}")
def get_complaint_status(
    ticket_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieves real-time progress and resolution notes for a specific ticket."""
    service = CivicFixService(db)
    complaint = service.get_complaint_by_ticket(ticket_id)

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CivicFix ticket '{ticket_id}' not found.",
        )

    return {"complaint": complaint}
