from __future__ import annotations

import asyncio
import hmac
import json
import json
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
PROBE_TIMEOUT = 30
PROBE_TIMEOUT = 30
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DrivePlay Transcoder",
    version="0.2.0",
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


def choose_codecs(streams: list[dict[str, object]]) -> tuple[str, str]:
    """Copy already browser-friendly streams; transcode only incompatible streams."""
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    if video is None:
        raise HTTPException(status_code=422, detail="Source has no video stream.")

    video_codec = (
        "copy"
        if video.get("codec_name") == "h264" and video.get("pix_fmt") == "yuv420p"
        else "libx264"
    )
    audio_channels = audio.get("channels", 2) if audio else 2
    audio_codec = (
        "copy"
        if audio
        and audio.get("codec_name") == "aac"
        and isinstance(audio_channels, int)
        and audio_channels <= 2
        else "aac"
    )
    return video_codec, audio_codec


async def _probe_source(source_url: str) -> list[dict[str, object]]:
    """Read stream metadata only; never accepts a caller-supplied URL."""
    if shutil.which("ffprobe") is None:
        raise HTTPException(status_code=503, detail="FFprobe is unavailable.")
    try:
        process = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error", "-rw_timeout", "15000000",
            "-show_entries", "stream=codec_type,codec_name,pix_fmt,channels",
            "-of", "json", source_url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=PROBE_TIMEOUT)
    except TimeoutError as exc:
        if "process" in locals() and process.returncode is None:
            await _stop_process(process)
        raise HTTPException(status_code=504, detail="Timed out while probing the source video.") from exc
    except OSError as exc:
        raise HTTPException(status_code=503, detail="FFprobe could not be started.") from exc

    if process.returncode != 0:
        logger.warning(
            "FFprobe exited with code %s: %s",
            process.returncode,
            stderr.decode("utf-8", errors="replace")[-2000:],
        )
        raise HTTPException(status_code=422, detail="Source video could not be probed.")
    try:
        result = json.loads(stdout.decode("utf-8"))
        streams = result.get("streams", [])
        if not isinstance(streams, list):
            raise ValueError("Invalid stream list")
        return [stream for stream in streams if isinstance(stream, dict)]
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Source video returned invalid probe metadata.") from exc


def choose_codecs(streams: list[dict[str, object]]) -> tuple[str, str]:
    """Copy browser-friendly streams and transcode only incompatible codecs."""
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if video is None:
        raise HTTPException(status_code=422, detail="Source has no video stream.")

    video_codec = "copy" if (
        video.get("codec_name") == "h264" and video.get("pix_fmt") == "yuv420p"
    ) else "libx264"
    channels = audio.get("channels", 2) if audio else 2
    audio_codec = "copy" if (
        audio and audio.get("codec_name") == "aac"
        and isinstance(channels, int) and channels <= 2
    ) else "aac"
    return video_codec, audio_codec


async def _probe_source(source_url: str) -> list[dict[str, object]]:
    """Probe the fixed, server-controlled source URL for codec metadata."""
    if shutil.which("ffprobe") is None:
        raise HTTPException(status_code=503, detail="FFprobe is unavailable.")
    try:
        process = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error", "-rw_timeout", "15000000",
            "-show_entries", "stream=codec_type,codec_name,pix_fmt,channels",
            "-of", "json", source_url,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=PROBE_TIMEOUT)
    except TimeoutError as exc:
        if "process" in locals() and process.returncode is None:
            await _stop_process(process)
        raise HTTPException(status_code=504, detail="Timed out while probing source video.") from exc
    except OSError as exc:
        raise HTTPException(status_code=503, detail="FFprobe could not be started.") from exc

    if process.returncode != 0:
        logger.warning("FFprobe exited with code %s: %s", process.returncode,
                       stderr.decode("utf-8", errors="replace")[-2000:])
        raise HTTPException(status_code=422, detail="Source video could not be probed.")
    try:
        metadata = json.loads(stdout.decode("utf-8"))
        streams = metadata.get("streams", [])
        if not isinstance(streams, list):
            raise ValueError("Invalid streams")
        return [s for s in streams if isinstance(s, dict)]
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid source probe metadata.") from exc


class SemaphoreLease:
    """Release an acquired semaphore at most once."""
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

    wait_task = asyncio.create_task(process.wait())
    done, _ = await asyncio.wait({wait_task}, timeout=PROCESS_TERMINATE_TIMEOUT)
    if not done:
        try:
            process.kill()
        except ProcessLookupError:
            pass
    await wait_task


async def _cancel_task(task: asyncio.Task | None) -> None:
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
    try:
        streams = await _probe_source(source_url)
        video_codec, audio_codec = choose_codecs(streams)
    except BaseException:
        lease.release()
        raise

    async def stream() -> AsyncIterator[bytes]:
        process: asyncio.subprocess.Process | None = None
        stderr_task: asyncio.Task[bytes] | None = None
        disconnect_task: asyncio.Task[None] | None = None
        read_task: asyncio.Task[bytes] | None = None
        try:
            if await request.is_disconnected():
                return

            args = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
                "-rw_timeout", "15000000", "-i", source_url,
                "-map", "0:v:0", "-map", "0:a:0?",
                "-sn", "-dn",
                "-c:v", video_codec,
            ]
            if video_codec != "copy":
                args.extend(["-preset", os.getenv("TRANSCODE_PRESET", "veryfast"),
                             "-crf", os.getenv("TRANSCODE_CRF", "23"),
                             "-pix_fmt", "yuv420p"])
            args.extend(["-c:a", audio_codec])
            if audio_codec != "copy":
                args.extend(["-b:a", os.getenv("TRANSCODE_AUDIO_BITRATE", "160k"), "-ac", "2"])
            args.extend([
                "-movflags", "frag_keyframe+empty_moov+default_base_moof",
                "-f", "mp4", "pipe:1",
            ])
            process = await asyncio.create_subprocess_exec(
                *args,
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

            return_code = await process.wait()
            stderr_output = await stderr_task
            if return_code != 0:
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
