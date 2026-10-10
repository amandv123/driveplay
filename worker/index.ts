export interface Env {}

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Range");
    headers.set(
      "Access-Control-Expose-Headers",
      "Accept-Ranges, Content-Length, Content-Range, Content-Type",
    );
    headers.set("Access-Control-Max-Age", "86400");
  }

  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function getBearerToken(request: Request): string | null {
  const match = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

async function getDriveFile(fileId: string, token: string): Promise<Response> {
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,capabilities(canDownload)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "driveplay-media" }, 200, origin);
    }

    const metadataPrefix = "/api/drive/files/";
    const streamPrefix = "/api/drive/stream/";
    const isMetadata = url.pathname.startsWith(metadataPrefix);
    const isStream = url.pathname.startsWith(streamPrefix);

    if ((!isMetadata && !isStream) || !["GET", "HEAD"].includes(request.method)) {
      return jsonResponse({ error: "Not found." }, 404, origin);
    }

    const prefix = isMetadata ? metadataPrefix : streamPrefix;
    const fileId = url.pathname.slice(prefix.length);

    if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
      return jsonResponse({ error: "Invalid Google Drive file ID." }, 400, origin);
    }

    const token = getBearerToken(request);
    if (!token) {
      return jsonResponse(
        { error: "A Google OAuth access token is required for this endpoint." },
        401,
        origin,
      );
    }

    try {
      const metadataResponse = await getDriveFile(fileId, token);

      if (!metadataResponse.ok) {
        const status = [401, 403, 404].includes(metadataResponse.status)
          ? metadataResponse.status
          : 502;
        return jsonResponse(
          { error: "Google Drive denied access or could not return file metadata." },
          status,
          origin,
        );
      }

      const file = await metadataResponse.json() as {
        id?: string;
        name?: string;
        mimeType?: string;
        size?: string;
        capabilities?: { canDownload?: boolean };
      };

      if (isMetadata) {
        return jsonResponse({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          canDownload: file.capabilities?.canDownload ?? false,
        }, 200, origin);
      }

      if (file.capabilities?.canDownload !== true) {
        return jsonResponse(
          { error: "Google Drive does not permit downloading this file." },
          403,
          origin,
        );
      }

      const mediaHeaders = new Headers({
        Authorization: `Bearer ${token}`,
      });
      const range = request.headers.get("Range");
      if (range) mediaHeaders.set("Range", range);

      const mediaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          method: request.method,
          headers: mediaHeaders,
        },
      );

      if (![200, 206, 416].includes(mediaResponse.status)) {
        return jsonResponse(
          {
            error: mediaResponse.status === 401 || mediaResponse.status === 403
              ? "Google Drive denied media access."
              : "Google Drive could not provide the video stream.",
          },
          mediaResponse.status === 401 || mediaResponse.status === 403 ? mediaResponse.status : 502,
          origin,
        );
      }

      const headers = corsHeaders(origin);
      for (const name of [
        "Content-Type",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "Last-Modified",
        "ETag",
      ]) {
        const value = mediaResponse.headers.get(name);
        if (value) headers.set(name, value);
      }

      headers.set("Cache-Control", "private, no-store");

      return new Response(
        request.method === "HEAD" ? null : mediaResponse.body,
        {
          status: mediaResponse.status,
          headers,
        },
      );
    } catch {
      return jsonResponse(
        { error: "Unable to contact Google Drive." },
        502,
        origin,
      );
    }
  },
} satisfies ExportedHandler<Env>;
