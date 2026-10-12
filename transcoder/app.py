from __future__ import annotations

import asyncio
import hmac
import logging
import os
import re
import shutil
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
CHUNK_SIZE = 64 * 1024
DISCONNECT_POLL_INTERVAL = 0.2
PROCESS_TERMINATE_TIMEOUT = 3
logger = logging.getLogger(__name__)

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


class SemaphoreLease:
    """Release a previously acquired semaphore at most once."""

    def __init__(self) -> None:
        self._released = False

    def release(self) -> None:
        if not self._released:
            self._released = True
            PROCESS_SEMAPHORE.release()


async def _wait_for_disconnect(request: Request) -> None:
    while not await request.is_disconnected():
        await asyncio.sleep(DISCONNECT_POLL_INTERVAL)


async def _stop_process(process: asyncio.subprocess.Process) -> None:
    """Stop FFmpeg promptly, escalating to kill if it ignores terminate."""
    if process.returncode is not None:
        return
    try:
        process.terminate()
    except ProcessLookupError:
        pass
    try:
        await asyncio.wait_for(asyncio.shield(process.wait()), timeout=PROCESS_TERMINATE_TIMEOUT)
    except TimeoutError:
        try:
            process.kill()
        except ProcessLookupError:
            pass
        await process.wait()


async def _cancel_task(task: asyncio.Task[object] | None) -> None:
    if task is None or task.done():
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


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
    if shutil.which("ffmpeg") is None:
        raise HTTPException(status_code=503, detail="FFmpeg is unavailable.")

    try:
        await asyncio.wait_for(PROCESS_SEMAPHORE.acquire(), timeout=0.25)
    except TimeoutError:
        raise HTTPException(status_code=429, detail="A transcode is already running. Try again shortly.")

    lease = SemaphoreLease()

    async def stream() -> AsyncIterator[bytes]:
        process: asyncio.subprocess.Process | None = None
        stderr_task: asyncio.Task[bytes] | None = None
        disconnect_task: asyncio.Task[None] | None = None
        read_task: asyncio.Task[bytes] | None = None
        try:
            if await request.is_disconnected():
                return

            process = await asyncio.create_subprocess_exec(
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
                "-rw_timeout", "15000000", "-i", source_url,
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
            disconnect_task = asyncio.create_task(_wait_for_disconnect(request))

            while True:
                read_task = asyncio.create_task(process.stdout.read(CHUNK_SIZE))
                done, _ = await asyncio.wait(
                    {read_task, disconnect_task},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                if disconnect_task in done:
                    await _cancel_task(read_task)
                    read_task = None
                    await _stop_process(process)
                    return

                chunk = read_task.result()
                read_task = None
                if not chunk:
                    break
                yield chunk

            # stdout EOF is not enough: wait for FFmpeg to flush and exit.
            return_code = await process.wait()
            stderr_output = await stderr_task
            if return_code != 0:
                # The response headers are already sent for streaming responses;
                # record the failure without logging tokens or request headers.
                logger.error(
                    "FFmpeg exited with code %s for file %s: %s",
                    return_code,
                    file_id,
                    stderr_output.decode("utf-8", errors="replace")[-4000:],
                )
        finally:
            await _cancel_task(read_task)
            await _cancel_task(disconnect_task)
            if process is not None and process.returncode is None:
                await _stop_process(process)
            if stderr_task is not None and not stderr_task.done():
                await _cancel_task(stderr_task)
            lease.release()

    # StreamingResponse can be cancelled before its generator is first iterated.
    # Its call-level finally guarantees the semaphore lease is still released.
    class LeasedStreamingResponse(StreamingResponse):
        async def __call__(self, scope, receive, send) -> None:
            try:
                await super().__call__(scope, receive, send)
            finally:
                lease.release()

    return LeasedStreamingResponse(
        stream(),
        media_type="video/mp4",
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Accel-Buffering": "no",
        },
    )
