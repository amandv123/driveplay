import os

os.environ.setdefault("TRANSCODE_API_TOKEN", "test-secret-that-is-at-least-32-characters")
import app
from fastapi.testclient import TestClient

client = TestClient(app.app)


def test_health_is_public():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "driveplay-transcoder"


def test_transcode_requires_auth():
    response = client.get("/api/transcode/abcdefghijk")
    assert response.status_code == 401


def test_invalid_file_id_is_rejected():
    response = client.get(
        "/api/transcode/not-valid!",
        headers={"Authorization": "Bearer test-secret-that-is-at-least-32-characters"},
    )
    assert response.status_code == 400


def test_missing_server_token_fails_closed(monkeypatch):
    monkeypatch.setattr(app, "API_TOKEN", "")
    response = client.get(
        "/api/transcode/abcdefghijk",
        headers={"Authorization": "Bearer test-secret-that-is-at-least-32-characters"},
    )
    assert response.status_code == 503
