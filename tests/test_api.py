"""API contract tests that need no LLM calls."""
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health_and_request_headers():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}
    assert "x-request-id" in r.headers and "x-process-time-ms" in r.headers


def test_apps_lists_eight_services():
    assert len(client.get("/api/apps").json()) == 8


def test_analyze_rejects_unknown_app():
    r = client.post("/api/analyze", json={"text": "app not opening", "app_name": "NotAnApp"})
    assert r.status_code == 422


def test_analyze_rejects_empty_text():
    assert client.post("/api/analyze", json={"text": "", "app_name": "UMANG"}).status_code == 422


def test_research_endpoint_shape():
    d = client.get("/api/research").json()
    assert {"progress", "tables", "figures", "summary"} <= d.keys()
