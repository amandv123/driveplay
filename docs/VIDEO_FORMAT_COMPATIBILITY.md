# Video Format Compatibility and Transcoding Plan

## Current behavior

DrivePlay currently sends the Google Drive byte stream to the browser's native HTML5 `<video>` element. This preserves the original media bytes and supports HTTP Range requests, but playback is limited to formats and codecs the user's browser/device can demux and decode.

A file extension does not establish codec compatibility. For example, MKV is a container and HEVC/H.265 is a video codec; renaming an MKV to MP4 does not convert either the container contents or codec.

## Confirmed diagnostic case

Tested in Windows desktop Chrome 155:

- Source file name: `I.Robot.2004.Open.Matte.DS4K.1080p.Ai.BluRay.10bit.x265.HEVC.mkv`
- Stream response: HTTP `206 Partial Content`
- `Content-Type`: `application/octet-stream`
- `Content-Range`: `bytes 0-63/7095096426`
- Initial bytes identify the Matroska container.
- `canPlayType('video/mp4; codecs="hvc1.1.6.L153.B0"')` returned an empty string; the H.264 probe returned `probably`.

This evidence points to a browser/codec compatibility limitation, not a failed Range response. The filename is not a full media probe, so exact audio codecs and all stream properties remain unverified.

## Options considered

### 1. Native playback (keep as default)

- No re-encoding and no quality loss.
- Efficient byte-range streaming and seeking.
- Works only when the browser/device supports the container and codecs.

### 2. Browser-side FFmpeg/WebAssembly

- Can run media conversion in a browser worker.
- Requires media to be written into the FFmpeg WebAssembly virtual filesystem before processing and output readback.
- FFmpeg.wasm documentation reports substantially slower performance than native FFmpeg in its published benchmark; multi-threading consumes more memory and CPU.
- Not a good default for a multi-gigabyte Drive file: whole-file staging and conversion may consume excessive memory, storage and time. Do not download/transcode a 7 GB file automatically in the browser.

References:
- https://ffmpegwasm.netlify.app/docs/overview/
- https://ffmpegwasm.netlify.app/docs/performance/

### 3. Server-side transcoding (future compatibility path)

Use a separately hosted FFmpeg-capable service, while Cloudflare Worker remains a lightweight authorization/streaming proxy. The transcoding service must:

- Accept only authorized DrivePlay media IDs or signed, short-lived source tickets; never arbitrary URLs (avoid SSRF).
- Preserve the original source and create a separate compatible output.
- Stream fragmented MP4/H.264 (and compatible audio) or HLS to the custom player.
- Support cancellation, concurrency limits, timeouts, and per-user quotas.
- Handle seeking deliberately. A one-pass live transcode is not automatically seekable; seeking may require restart/segment-based output or cached renditions.
- Avoid buffering the entire source/output in memory.
- Document hosting cost, CPU/GPU requirements, and data retention.

Cloudflare Workers are not the appropriate place to perform sustained full-video transcoding: their documented per-request CPU time is limited (up to 5 minutes on paid plans by default configurable limits) and memory is 128 MB. Keep the Worker focused on delivery, not FFmpeg execution.

Reference: https://developers.cloudflare.com/workers/platform/limits/

## Recommended rollout

1. Keep native direct streaming as the default.
2. Detect and explain unsupported media without implying the stream is broken.
3. Add an explicit, opt-in “Try compatible playback” path only after a separate FFmpeg service is deployed and secured.
4. Start with short, user-authorized test clips; verify audio, subtitles, seeking, cancellation, and quality before testing multi-gigabyte files.
5. Never claim universal format support. Compatibility depends on the chosen output profile and browser/device.

## Acceptance criteria for a future transcoding implementation

- The existing native stream path remains unchanged for supported formats.
- No Google embedded player or Google sign-in UI is introduced into the playback experience.
- No original Drive file is modified.
- No source file is silently downloaded in full to browser memory.
- Compatible output starts playing before the whole conversion completes where the selected output format and service architecture support it.
- Seeking, pause/resume, cancellation, and errors are explicitly tested.
- Secrets, raw access tokens, and arbitrary external URLs are not exposed to the browser.
