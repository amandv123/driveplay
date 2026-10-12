import asyncio
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("TRANSCODE_API_TOKEN", "test-secret-that-is-at-least-32-characters")

import app
from fastapi.testclient import TestClient

TOKEN = "test-secret-that-is-at-least-32-characters"
AUTH_HEADERS = {"Authorization": f"Bearer {TOKEN}"}
client = TestClient(app.app)


class FakeProcess:
    def __init__(self, output: bytes = b"", exit_code: int = 0, stderr: bytes = b"", block: bool = False):
        self.stdout = asyncio.StreamReader()
        self.stderr = asyncio.StreamReader()
        self.returncode = None
        self.exit_code = exit_code
        self.terminated = False
        self.killed = False
        self.wait_called = False
        if not block:
            if output:
                self.stdout.feed_data(output)
            self.stdout.feed_eof()
        if stderr:
            self.stderr.feed_data(stderr)
        self.stderr.feed_eof()

    async def wait(self):
        self.wait_called = True
        if self.returncode is None:
            self.returncode = self.exit_code
        return self.returncode

    def terminate(self):
        self.terminated = True
        self.returncode = -15
        self.stdout.feed_eof()

    def kill(self):
        self.killed = True
        self.returncode = -9
        self.stdout.feed_eof()


class FakeRequest:
    def __init__(self, disconnect_after_first_check: bool = False):
        self.checks = 0
        self.disconnect_after_first_check = disconnect_after_first_check

    async def is_disconnected(self):
        self.checks += 1
        return self.disconnect_after_first_check and self.checks >= 2


def fake_ffmpeg(monkeypatch, process: FakeProcess):
    monkeypatch.setattr(app.shutil, "which", lambda _: "/usr/bin/ffmpeg")

    async def create_subprocess_exec(*args, **kwargs):
        return process

    monkeypatch.setattr(app.asyncio, "create_subprocess_exec", create_subprocess_exec)


def test_health_is_public():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "driveplay-transcoder"


def test_transcode_requires_auth():
    response = client.get("/api/transcode/abcdefghijk")
    assert response.status_code == 401


def test_invalid_file_id_is_rejected():
    response = client.get("/api/transcode/not-valid!", headers=AUTH_HEADERS)
    assert response.status_code == 400


def test_missing_server_token_fails_closed(monkeypatch):
    monkeypatch.setattr(app, "API_TOKEN", "")
    response = client.get("/api/transcode/abcdefghijk", headers=AUTH_HEADERS)
    assert response.status_code == 503


def test_invalid_bearer_token_is_rejected():
    response = client.get(
        "/api/transcode/abcdefghijk",
        headers={"Authorization": "Bearer wrong-secret"},
    )
    assert response.status_code == 401


def test_ffmpeg_missing_fails_before_stream_headers(monkeypatch):
    monkeypatch.setattr(app.shutil, "which", lambda _: None)
    response = client.get("/api/transcode/abcdefghijk", headers=AUTH_HEADERS)
    assert response.status_code == 503
    assert response.json()["detail"] == "FFmpeg is unavailable."


def test_successful_transcode_streams_fragmented_mp4(monkeypatch):
    process = FakeProcess(output=b"fragmented-mp4-data")
    fake_ffmpeg(monkeypatch, process)

    response = client.get("/api/transcode/abcdefghijk", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("video/mp4")
    assert response.content == b"fragmented-mp4-data"
    assert process.wait_called
    assert process.returncode == 0


def test_ffmpeg_nonzero_exit_is_logged(monkeypatch, caplog):
    process = FakeProcess(output=b"partial-mp4", exit_code=1, stderr=b"decode failed")
    fake_ffmpeg(monkeypatch, process)

    with caplog.at_level("ERROR", logger="app"):
        response = client.get("/api/transcode/abcdefghijk", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.content == b"partial-mp4"
    assert "FFmpeg exited with code 1" in caplog.text
    assert "decode failed" in caplog.text


def test_disconnect_stops_ffmpeg_and_releases_semaphore(monkeypatch):
    process = FakeProcess(block=True)
    fake_ffmpeg(monkeypatch, process)

    async def run():
        request = FakeRequest(disconnect_after_first_check=True)
        response = await app.transcode("abcdefghijk", request, authorization=f"Bearer {TOKEN}")
        chunks = [chunk async for chunk in response.body_iterator]
        return chunks

    chunks = asyncio.run(run())

    assert chunks == []
    assert process.terminated or process.killed
    assert app.PROCESS_SEMAPHORE._value == app.MAX_CONCURRENT_TRANSCODES


def test_cancelled_stream_stops_ffmpeg_and_releases_semaphore(monkeypatch):
    process = FakeProcess(block=True)
    fake_ffmpeg(monkeypatch, process)

    async def run():
        request = FakeRequest()
        response = await app.transcode("abcdefghijk", request, authorization=f"Bearer {TOKEN}")
        consumer = asyncio.create_task(response.body_iterator.__anext__())
        # Give the async generator time to spawn FFmpeg and begin its blocked read.
        for _ in range(50):
            await asyncio.sleep(0.01)
            if not process.wait_called and request.checks >= 2:
                break
        consumer.cancel()
        with pytest.raises(asyncio.CancelledError):
            await consumer

    asyncio.run(run())

    assert process.terminated or process.killed
    assert app.PROCESS_SEMAPHORE._value == app.MAX_CONCURRENT_TRANSCODES


def test_process_stop_escalates_to_kill(monkeypatch):
    class StubbornProcess(FakeProcess):
        async def wait(self):
            await asyncio.sleep(1)
            return self.returncode

        def terminate(self):
            self.terminated = True

        def kill(self):
            self.killed = True
            self.returncode = -9

    process = StubbornProcess(block=True)
    monkeypatch.setattr(app, "PROCESS_TERMINATE_TIMEOUT", 0.01)

    asyncio.run(app._stop_process(process))

    assert process.terminated
    assert process.killed
