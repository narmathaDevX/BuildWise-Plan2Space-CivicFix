"""Unit tests for CivicFix Real-Time Municipal API Integration."""

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
    assert "connection_status" in data
    assert "departments" in data
    assert "complaints" in data


def test_civic_list_complaints():
    res = client.get("/api/civic/complaints")
    assert res.status_code == 200
    data = res.json()
    assert "complaints" in data
    assert "connected" in data
    assert isinstance(data["complaints"], list)


def test_civic_submit_plot_complaint():
    payload = {
        "title": "Blocked drainage culvert in front of Plot 102",
        "description": "Culvert blocked with construction rubble and silt, causing street water to enter site boundary.",
        "category": "Water Supply & Drainage",
        "location": "Plot 102, 3rd Avenue, Anna Nagar, Chennai",
        "priority": "High",
    }
    res = client.post("/api/civic/complaints", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert "CF-2026-" in data["complaint"]["ticket_id"]
    assert data["complaint"]["priority"] == "High"

    # Test retrieval by ticket ID from live CivicFix
    ticket_id = data["complaint"]["ticket_id"]
    get_res = client.get(f"/api/civic/complaints/{ticket_id}")
    assert get_res.status_code == 200
    assert get_res.json()["complaint"]["ticket_id"] == ticket_id


def test_civic_upload_endpoints():
    import io

    fake_file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("evidence_hazard.png", io.BytesIO(fake_file_content), "image/png")}
    form = {"ticket_id": "CF-2026-UPLOAD-01"}

    # Test /api/civic/upload
    res = client.post("/api/civic/upload", files=files, data=form)
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "success"
    assert "/uploads/" in body["file_url"]
    assert body["ticket_id"] == "CF-2026-UPLOAD-01"

    # Test alias /api/upload
    files2 = {"file": ("evidence_hazard_2.png", io.BytesIO(fake_file_content), "image/png")}
    res2 = client.post("/api/upload", files=files2)
    assert res2.status_code == 201
    assert "/uploads/" in res2.json()["file_url"]

    # Test listing uploads via both endpoints
    list_res = client.get("/api/civic/uploads")
    assert list_res.status_code == 200
    assert "files" in list_res.json()
    assert list_res.json()["count"] >= 1

    list_res_alias = client.get("/api/uploads")
    assert list_res_alias.status_code == 200
    assert list_res_alias.json()["count"] >= 1
