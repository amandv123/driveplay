# DrivePlay FFmpeg Transcoder (experimental)

This is a separate Docker service. It is intentionally not wired into the browser or Cloudflare Worker yet. Keep native playback as the default until a deployment has been tested end-to-end.

## What it does

- Accepts a Google Drive file ID only; callers cannot supply arbitrary URLs.
- Requires a server-side bearer token of at least 32 characters.
- Reads from the fixed DrivePlay public-stream Worker URL.
- Uses FFmpeg to emit fragmented MP4 (H.264 video + AAC stereo audio) progressively.
- Limits concurrent transcodes (default: one), terminates FFmpeg when the client disconnects, and does not store the original or converted video.

This first version is a streaming proof of concept, **not a production transcoder**. It does not support HTTP Range requests against the converted output, so arbitrary seeking in the converted stream is not available yet. Subtitles, multiple audio tracks, HDR tone mapping, and audio/video edge cases are not handled.

## Local run with Docker

~~~powershell
docker build -t driveplay-transcoder ./transcoder
docker run --rm -p 8000:8000 -e TRANSCODE_API_TOKEN=replace-with-a-random-secret-at-least-32-characters driveplay-transcoder
~~~

Health check: http://localhost:8000/health.

Authenticated test (use only a short video you own or are authorized to play):

~~~powershell
curl.exe -N -H "Authorization: Bearer replace-with-a-random-secret-at-least-32-characters" "http://localhost:8000/api/transcode/YOUR_PUBLIC_DRIVE_FILE_ID" -o test-output.mp4
~~~

The output is a progressive stream; saving it to a file in this manual test is only for validation. Do not test against a multi-gigabyte file until the service's CPU, memory, bandwidth, and cancellation behavior are understood.

## Deployment notes

The service needs an actual FFmpeg binary and sustained CPU time. Cloudflare Workers are not an FFmpeg runtime. Render's free web service can be useful for checking that the container starts, but its documented free instance is small, sleeps after 15 minutes idle, has an ephemeral filesystem, and has usage/bandwidth constraints. Do not assume it can transcode a 7 GB HEVC movie in real time or provide reliable playback. Verify current plan limits before deploying and keep spending disabled if the budget is ₹0.

For any deployment:
1. Set TRANSCODE_API_TOKEN to a strong random value (32+ characters) as a server-side secret.
2. Set SOURCE_STREAM_BASE to the trusted DrivePlay Worker base only.
3. Keep MAX_CONCURRENT_TRANSCODES=1 on a small instance.
4. Do not expose the token in Vite variables or frontend JavaScript.
5. Do not connect this endpoint to the public frontend until the Cloudflare Worker can authenticate to it using server-side secrets.
6. Confirm the source file is public-downloadable; this initial service does not accept private OAuth playback tickets.

## Security and limitations

- Only file IDs matching a conservative pattern are accepted.
- No arbitrary URL, custom host, or FFmpeg argument is accepted from the request.
- The service does not bypass Google Drive sharing or download permissions.
- This MVP does not yet enforce a per-user quota; do not expose it publicly without a trusted proxy and abuse controls.
- The API token is a shared service credential, not end-user authentication.
- FFmpeg output is a one-pass fragmented MP4 stream. Seeking needs a separate segment/caching design; merely adding Accept-Ranges would be incorrect.
