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
CIVICFIX_API_TOKEN = os.getenv("CIVICFIX_API_TOKEN", "")

# Default Municipal Departments in Tamil Nadu Urban Local Bodies
DEFAULT_DEPARTMENTS = [
    {"id": 1, "name": "Greater Chennai Corporation (GCC) - Roads & Works", "category": "Roads & Footpaths"},
    {"id": 2, "name": "CMWSSB (Metro Water & Sewerage Board)", "category": "Water & Sanitation"},
    {"id": 3, "name": "TANGEDCO (TNEB Electrical Distribution)", "category": "Streetlights & Electrical"},
    {"id": 4, "name": "Municipal Solid Waste & Sanitation Dept", "category": "Garbage & Waste"},
    {"id": 5, "name": "Tamil Nadu PWD - Stormwater Drainage Division", "category": "Drainage & Flood Mitigation"},
]

# Seed baseline civic history across multiple areas for realistic analysis
SEED_CIVIC_HISTORY = [
    # --- Anna Nagar, Chennai ---
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
    # --- T. Nagar, Chennai ---
    {
        "ticket_id": "CF-2026-TN0481",
        "title": "Commercial debris dumping blocking pedestrian walkway and plot entrance",
        "description": "Unauthorized building debris and commercial waste dumped adjacent to plot frontage, preventing gate fabrication.",
        "category": "Garbage & Waste",
        "location": "Plot 18, Usman Road Extension, T. Nagar, Chennai",
        "priority": "High",
        "status": "In Progress",
        "assigned_department": "Municipal Solid Waste & Sanitation Dept",
        "image_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
        "resolution": None,
        "created_at": "2026-10-22T08:30:00Z",
    },
    {
        "ticket_id": "CF-2026-TN0912",
        "title": "Frequent sewer backflow at street connection chamber",
        "description": "Underground sewer manhole leaking during peak morning hours, creating dampness along site boundary wall.",
        "category": "Water & Sanitation",
        "location": "Plot 18, Usman Road Extension, T. Nagar, Chennai",
        "priority": "Critical",
        "status": "Resolved",
        "assigned_department": "CMWSSB (Metro Water & Sewerage Board)",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=600",
        "resolution": {
            "notes": "Jet rodding machine deployed. Main line blockage cleared and chamber cover sealed.",
            "resolved_by": "Er. R. Murali (Area Engineer, GCC Zone 10)",
            "resolved_at": "2026-10-23T15:40:00Z",
        },
        "created_at": "2026-10-20T11:00:00Z",
    },
    # --- Velachery, Chennai ---
    {
        "ticket_id": "CF-2026-VL3302",
        "title": "Low-lying road depression causing chronic water stagnation",
        "description": "Front access road is 400mm below main arterial grade, causing prolonged ponding after rain. Requires plinth elevation guidance.",
        "category": "Drainage & Flood Mitigation",
        "location": "Plot 77, 100 Feet Bypass Road, Velachery, Chennai",
        "priority": "High",
        "status": "In Progress",
        "assigned_department": "Tamil Nadu PWD - Stormwater Drainage Division",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600",
        "resolution": None,
        "created_at": "2026-10-25T09:00:00Z",
    },
    # --- OMR / Perungudi, Chennai ---
    {
        "ticket_id": "CF-2026-OM8104",
        "title": "Metro rail utility shifting trench barricade fallen onto site driveway",
        "description": "Excavation safety sheets detached during heavy wind, partially obstructing site approach.",
        "category": "Roads & Footpaths",
        "location": "Plot 12, Rajiv Gandhi Salai, OMR / Perungudi, Chennai",
        "priority": "Medium",
        "status": "Resolved",
        "assigned_department": "Greater Chennai Corporation (GCC) - Roads & Works",
        "image_url": "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=600",
        "resolution": {
            "notes": "Re-secured barricades with ballast weights and cleared driveway boundary.",
            "resolved_by": "GCC Highway Patrol Unit 4",
            "resolved_at": "2026-10-21T18:00:00Z",
        },
        "created_at": "2026-10-21T07:15:00Z",
    },
]


def generate_ticket_id() -> str:
    return f"CF-2026-{uuid.uuid4().hex[:6].upper()}"


def compute_site_infrastructure_health(
    complaints: list[dict[str, Any]],
    location_name: Optional[str] = None
) -> dict[str, Any]:
    """Calculates site infrastructure health score (0-100) based on local civic hazard density."""
    if not complaints:
        loc_str = f" for '{location_name}'" if location_name else ""
        return {
            "health_score": 98.0,
            "risk_level": "LOW",
            "total_reported": 0,
            "active_issues": 0,
            "resolved_issues": 0,
            "category_breakdown": {},
            "civil_advisory": [
                f"No active civic hazards or municipal violations recorded{loc_str}.",
                "Frontage roads, electrical lines, and storm drains meet site readiness criteria.",
                "Standard +450mm plinth above road crown level recommended for building plan approval."
            ],
        }

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

    category_counts: dict[str, int] = {}
    for c in complaints:
        cat = c.get("category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    recommendations = []
    if any(c.get("category") in ("Water & Sanitation", "Drainage & Flood Mitigation") for c in active_issues):
        recommendations.append(
            "CRITICAL DRAINAGE ALERT: Elevate building ground finish plinth to at least +600mm above road crown level to prevent monsoon backflow."
        )
    if any(c.get("category") == "Streetlights & Electrical" for c in active_issues):
        recommendations.append(
            "ELECTRICAL SAFETY NOTICE: Maintain minimum 3.7m horizontal clearance from overhead LT/HT lines as mandated by National Building Code (NBC Part 8)."
        )
    if any(c.get("category") == "Roads & Footpaths" for c in active_issues):
        recommendations.append(
            "SITE LOGISTICS NOTICE: Road surface damage or trenching reported. Schedule heavy ready-mix concrete (RMC) deliveries during off-peak morning hours."
        )
    if any(c.get("category") == "Garbage & Waste" for c in active_issues):
        recommendations.append(
            "SOLID WASTE MANAGEMENT: Request GCC zone tractor pickup for construction debris staging before commencing foundation excavation."
        )

    if not recommendations:
        recommendations.append("All reported municipal issues in this area have been rectified by local authorities.")
        recommendations.append("Plot readiness is verified for construction commencement.")

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
        """Returns health score, active complaints, and history for a given plot location or area name."""
        complaints = self.get_complaints_for_area(location_query)
        health_summary = compute_site_infrastructure_health(complaints, location_name=location_query)

        return {
            "query_location": location_query or "All Areas / Anna Nagar, Chennai",
            "health_summary": health_summary,
            "departments": DEFAULT_DEPARTMENTS,
            "complaints": complaints,
        }

    def get_complaints_for_area(self, location_query: Optional[str] = None) -> list[dict[str, Any]]:
        """Queries local database complaints and merges with seed history, filtered by location."""
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

        if location_query and location_query.strip():
            # Extract search terms (e.g. "Anna Nagar" or "T. Nagar" or "Velachery")
            q = location_query.lower().strip()
            # Split tokens to match e.g. "Anna Nagar" even if user typed "Anna Nagar, Chennai"
            terms = [t.strip() for t in q.replace(",", " ").split() if len(t.strip()) > 2]
            
            filtered = []
            for c in combined:
                loc_text = f"{c.get('location', '')} {c.get('title', '')} {c.get('category', '')}".lower()
                if q in loc_text or any(term in loc_text for term in terms):
                    filtered.append(c)

            return filtered

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
        assigned_dept = "Greater Chennai Corporation (GCC) - Roads & Works"
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
        headers = {}
        if CIVICFIX_API_TOKEN:
            headers["Authorization"] = f"Bearer {CIVICFIX_API_TOKEN}"

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(
                    f"{CIVICFIX_API_URL}/complaints",
                    headers=headers,
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
