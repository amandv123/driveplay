from __future__ import annotations

import asyncio
import hmac
import os
import re
from typing import AsyncIterator

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

FILE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{10,200}$")
SOURCE_STREAM_BASE = os.getenv(
    "SOURCE_STREAM_BASE",
    "https://driveplay-media.adtools.workers.dev/api/public/stream/",
).rstrip("/") + "/"
API_TOKEN = os.getenv("TRANSCODE_API_TOKEN", "")
MAX_CONCURRENT_TRANSCODES = max(1, int(os.getenv("MAX_CONCURRENT_TRANSCODES", "1")))
PROCESS_SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_TRANSCODES)

app = FastAPI(
    title="DrivePlay Transcoder",
    version="0.1.0",
    description="Opt-in FFmpeg streaming for public media already accessible through DrivePlay.",
)


@app.get("/health")
async def health() -> dict[str, object]:
    return {"ok": True, "service": "driveplay-transcoder"}


def authorize(authorization: str | None) -> None:
    if len(API_TOKEN) < 32:
        raise HTTPException(status_code=503, detail="Transcoding service is not configured.")
    if authorization is None or not hmac.compare_digest(authorization, f"Bearer {API_TOKEN}"):
        raise HTTPException(status_code=401, detail="Unauthorized.")


@app.get("/api/transcode/{file_id}")
async def transcode(
    file_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
) -> StreamingResponse:
    authorize(authorization)
    if not FILE_ID_RE.fullmatch(file_id):
        raise HTTPException(status_code=400, detail="Invalid Google Drive file ID.")

    # Never accept an arbitrary source URL. This fixed upstream prevents SSRF.
    source_url = SOURCE_STREAM_BASE + file_id
    try:
        await asyncio.wait_for(PROCESS_SEMAPHORE.acquire(), timeout=0.25)
    except TimeoutError:
        raise HTTPException(status_code=429, detail="A transcode is already running. Try again shortly.")

    async def stream() -> AsyncIterator[bytes]:
        process: asyncio.subprocess.Process | None = None
        stderr_task: asyncio.Task[bytes] | None = None
        try:
            if await request.is_disconnected():
                return
            process = await asyncio.create_subprocess_exec(
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
                "-i", source_url,
                "-map", "0:v:0", "-map", "0:a:0?",
                "-sn", "-dn",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "160k", "-ac", "2",
                "-movflags", "frag_keyframe+empty_moov+default_base_moof",
                "-f", "mp4", "pipe:1",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            assert process.stdout is not None and process.stderr is not None
            stderr_task = asyncio.create_task(process.stderr.read())
            while True:
                if await request.is_disconnected():
                    break
                chunk = await process.stdout.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
            if process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=3)
                except TimeoutError:
                    process.kill()
                    await process.wait()
            if stderr_task:
                await stderr_task
        finally:
            if process and process.returncode is None:
                process.kill()
                await process.wait()
            if stderr_task and not stderr_task.done():
                stderr_task.cancel()
            PROCESS_SEMAPHORE.release()

    # Check FFmpeg before headers are committed, so a missing binary yields a 503.
    try:
        check = await asyncio.create_subprocess_exec(
            "ffmpeg", "-version",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await check.wait()
        if check.returncode != 0:
            PROCESS_SEMAPHORE.release()
            raise HTTPException(status_code=503, detail="FFmpeg is unavailable.")
    except FileNotFoundError:
        PROCESS_SEMAPHORE.release()
        raise HTTPException(status_code=503, detail="FFmpeg is unavailable.")

    return StreamingResponse(
        stream(),
        media_type="video/mp4",
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Accel-Buffering": "no",
        },
    )
