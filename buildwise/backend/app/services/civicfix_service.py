"""CivicFix Service: Integrates BuildWise with CivicFix municipal complaint & civic health APIs."""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
import httpx
from sqlalchemy.orm import Session

from backend.app.db.models import CivicPlotComplaint

logger = logging.getLogger("buildwise.civicfix")

CIVICFIX_API_URL = os.getenv("CIVICFIX_API_URL", "http://127.0.0.1:8002")

# Default Municipal Departments in Tamil Nadu Urban Local Bodies
DEFAULT_DEPARTMENTS = [
    {"id": 1, "name": "Greater Chennai Corporation (GCC) - Roads & Works", "category": "Roads & Footpaths"},
    {"id": 2, "name": "CMWSSB (Metro Water & Sewerage Board)", "category": "Water & Sanitation"},
    {"id": 3, "name": "TANGEDCO (TNEB Electrical Distribution)", "category": "Streetlights & Electrical"},
    {"id": 4, "name": "Municipal Solid Waste & Sanitation Dept", "category": "Garbage & Waste"},
    {"id": 5, "name": "Tamil Nadu PWD - Stormwater Drainage Division", "category": "Drainage & Flood Mitigation"},
]

# Seed baseline civic history for realistic area analysis
SEED_CIVIC_HISTORY = [
    {
        "ticket_id": "CF-2026-A109B1",
        "title": "Severe road damage and trenching due to underground cabling",
        "description": "Access road directly adjacent to the plot has deep trenches left open. Heavy concrete mixer trucks unable to enter site.",
        "category": "Roads & Footpaths",
        "location": "Plot 42, 2nd Main Road, Anna Nagar, Chennai",
        "priority": "High",
        "status": "Resolved",
        "assigned_department": "Greater Chennai Corporation (GCC) - Roads & Works",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600",
        "resolution": {
            "notes": "Trench filled and asphalt re-laid. Full vehicular access restored for construction vehicles.",
            "resolved_by": "Er. K. Senthil Kumar (Assistant Executive Engineer, Zone 8)",
            "resolved_at": "2026-10-14T11:30:00Z",
        },
        "created_at": "2026-10-10T09:15:00Z",
    },
    {
        "ticket_id": "CF-2026-B882C4",
        "title": "Stormwater drain silt accumulation and waterlogging hazard",
        "description": "Drain outlet blocked by silt causing overflow onto the plot corner during pre-monsoon showers.",
        "category": "Water & Sanitation",
        "location": "Plot 42, 2nd Main Road, Anna Nagar, Chennai",
        "priority": "Medium",
        "status": "Resolved",
        "assigned_department": "Tamil Nadu PWD - Stormwater Drainage Division",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=600",
        "resolution": {
            "notes": "Suction truck deployed to desilt 120m stretch of stormwater canal. Flow clear.",
            "resolved_by": "M. Vignesh (Zonal Sanitary Officer)",
            "resolved_at": "2026-10-18T16:00:00Z",
        },
        "created_at": "2026-10-15T14:20:00Z",
    },
    {
        "ticket_id": "CF-2026-C441D9",
        "title": "Leaning electrical pole and low-hanging LT distribution line",
        "description": "Overhead distribution wire hanging below 12ft clearance, posing electrocution risk to scaffolding and crane operation.",
        "category": "Streetlights & Electrical",
        "location": "Plot 42, 2nd Main Road, Anna Nagar, Chennai",
        "priority": "Critical",
        "status": "In Progress",
        "assigned_department": "TANGEDCO (TNEB Electrical Distribution)",
        "image_url": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600",
        "resolution": None,
        "created_at": "2026-10-24T10:00:00Z",
    },
]


def generate_ticket_id() -> str:
    return f"CF-2026-{uuid.uuid4().hex[:6].upper()}"


def compute_site_infrastructure_health(complaints: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculates site infrastructure health score (0-100) based on local civic hazard density."""
    active_issues = [c for c in complaints if c.get("status") not in ("Resolved", "Rejected")]
    critical_count = sum(1 for c in active_issues if c.get("priority") == "Critical")
    high_count = sum(1 for c in active_issues if c.get("priority") == "High")
    med_count = sum(1 for c in active_issues if c.get("priority") == "Medium")

    penalty = (critical_count * 20.0) + (high_count * 10.0) + (med_count * 4.0)
    score = max(45.0, min(98.0, 95.0 - penalty))

    risk_level = "LOW"
    if score < 70.0:
        risk_level = "HIGH"
    elif score < 85.0:
        risk_level = "MODERATE"

    category_counts = {}
    for c in complaints:
        cat = c.get("category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    recommendations = []
    if any(c.get("category") == "Water & Sanitation" for c in active_issues):
        recommendations.append("Elevate finished plinth level by +1.5 ft above road crown due to regional stormwater drain backlog.")
    if any(c.get("category") == "Streetlights & Electrical" for c in active_issues):
        recommendations.append("Notify TNEB section officer to insulate overhead lines before erecting exterior scaffolding.")
    if not recommendations:
        recommendations.append("Road frontage, underground drainage, and electrical lines in this area are clear for construction.")

    return {
        "health_score": round(score, 1),
        "risk_level": risk_level,
        "total_reported": len(complaints),
        "active_issues": len(active_issues),
        "resolved_issues": len(complaints) - len(active_issues),
        "category_breakdown": category_counts,
        "civil_advisory": recommendations,
    }


class CivicFixService:
    """Orchestrates communication with CivicFix API and local database cache."""

    def __init__(self, db: Session):
        self.db = db

    def list_departments(self) -> list[dict[str, Any]]:
        return DEFAULT_DEPARTMENTS

    def get_plot_overview(self, location_query: Optional[str] = None) -> dict[str, Any]:
        """Returns health score, active complaints, and history for a given plot location."""
        complaints = self.get_complaints_for_area(location_query)
        health_summary = compute_site_infrastructure_health(complaints)

        return {
            "query_location": location_query or "Default Active Site (Anna Nagar, Chennai)",
            "health_summary": health_summary,
            "departments": DEFAULT_DEPARTMENTS,
            "complaints": complaints,
        }

    def get_complaints_for_area(self, location_query: Optional[str] = None) -> list[dict[str, Any]]:
        """Queries local database complaints and merges with seed history."""
        db_records = (
            self.db.query(CivicPlotComplaint)
            .order_by(CivicPlotComplaint.created_at.desc())
            .all()
        )
        saved = [r.to_dict() for r in db_records]

        # Combine database records with baseline history (de-duplicated by ticket_id)
        seen_tickets = {s["ticket_id"] for s in saved}
        combined = list(saved)
        for h in SEED_CIVIC_HISTORY:
            if h["ticket_id"] not in seen_tickets:
                combined.append(h)

        if location_query:
            q = location_query.lower().strip()
            filtered = [
                c for c in combined
                if q in c.get("location", "").lower()
                or q in c.get("title", "").lower()
                or q in c.get("category", "").lower()
            ]
            return filtered or combined

        return combined

    async def file_complaint(
        self,
        payload: dict[str, Any],
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Creates a new complaint in buildwise.db and forwards it to CivicFix API."""
        ticket_id = generate_ticket_id()
        category = payload.get("category", "Roads & Footpaths")

        # Assign appropriate department automatically
        assigned_dept = "Greater Chennai Corporation (GCC) - Works Dept"
        for dept in DEFAULT_DEPARTMENTS:
            if dept["category"].lower() in category.lower() or category.lower() in dept["category"].lower():
                assigned_dept = dept["name"]
                break

        complaint = CivicPlotComplaint(
            ticket_id=ticket_id,
            user_id=user_id,
            project_id=project_id,
            title=payload.get("title", "Plot Infrastructure Issue"),
            description=payload.get("description", ""),
            category=category,
            location=payload.get("location", "Plot Site, Tamil Nadu"),
            priority=payload.get("priority", "Medium"),
            status="Submitted",
            assigned_department=assigned_dept,
            image_url=payload.get("image_url"),
        )

        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)

        # Attempt forwarding to live CivicFix API
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(
                    f"{CIVICFIX_API_URL}/complaints",
                    json={
                        "title": complaint.title,
                        "description": complaint.description,
                        "category": complaint.category,
                        "location": complaint.location,
                        "priority": complaint.priority,
                        "image_url": complaint.image_url,
                    },
                )
                if res.status_code in (200, 201):
                    logger.info("Successfully synced complaint to external CivicFix API")
        except Exception as e:
            logger.info(f"CivicFix live API sync skipped (running in resilient local mode): {e}")

        return complaint.to_dict()

    def get_complaint_by_ticket(self, ticket_id: str) -> Optional[dict[str, Any]]:
        record = (
            self.db.query(CivicPlotComplaint)
            .filter(CivicPlotComplaint.ticket_id == ticket_id)
            .first()
        )
        if record:
            return record.to_dict()

        for s in SEED_CIVIC_HISTORY:
            if s["ticket_id"] == ticket_id:
                return s

        return None
