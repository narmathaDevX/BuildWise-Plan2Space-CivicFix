"""Unit tests for CivicFix Plot & Municipal Portal integration."""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_civic_overview_endpoint():
    res = client.get("/api/civic/overview?location=Anna%20Nagar,%20Chennai")
    assert res.status_code == 200
    data = res.json()
    assert "health_summary" in data
    assert "health_score" in data["health_summary"]
    assert "departments" in data
    assert len(data["departments"]) > 0


def test_civic_list_complaints():
    res = client.get("/api/civic/complaints")
    assert res.status_code == 200
    data = res.json()
    assert "complaints" in data
    assert data["count"] >= 3


def test_civic_submit_plot_complaint():
    payload = {
        "title": "Blocked drainage culvert in front of Plot 102",
        "description": "Culvert blocked with construction rubble and silt, causing street water to enter site boundary.",
        "category": "Water & Sanitation",
        "location": "Plot 102, 3rd Avenue, Anna Nagar, Chennai",
        "priority": "High",
    }
    res = client.post("/api/civic/complaints", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert "CF-2026-" in data["complaint"]["ticket_id"]
    assert data["complaint"]["priority"] == "High"

    # Test retrieval by ticket ID
    ticket_id = data["complaint"]["ticket_id"]
    get_res = client.get(f"/api/civic/complaints/{ticket_id}")
    assert get_res.status_code == 200
    assert get_res.json()["complaint"]["ticket_id"] == ticket_id
