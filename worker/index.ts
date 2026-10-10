export interface Env {
  STREAM_ENCRYPTION_SECRET: string;
  ALLOWED_ORIGINS?: string;
}

const DEFAULT_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const TICKET_TTL_SECONDS = 5 * 60;

function allowedOrigins(env: Env): Set<string> {
  return new Set([
    ...DEFAULT_ORIGINS,
    ...(env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  ]);
}

function corsHeaders(origin: string | null, env: Env): Headers {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Range");
    headers.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Length, Content-Range, Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null, env: Env): Response {
  const headers = corsHeaders(origin, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function getBearerToken(request: Request): string | null {
  return request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

async function getDriveFile(fileId: string, token: string): Promise<Response> {
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,capabilities(canDownload)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  if (!secret || secret.length < 32) throw new Error("STREAM_ENCRYPTION_SECRET must contain at least 32 characters.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

type TicketPayload = { fileId: string; token: string; expiresAt: number };

async function createTicket(fileId: string, token: string, secret: string): Promise<string> {
  const payload: TicketPayload = {
    fileId,
    token,
    expiresAt: Math.floor(Date.now() / 1000) + TICKET_TTL_SECONDS,
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(combined);
}

async function readTicket(ticket: string, secret: string): Promise<TicketPayload | null> {
  try {
    const bytes = fromBase64Url(ticket);
    if (bytes.length < 29) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12) },
      await encryptionKey(secret),
      bytes.slice(12),
    );
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as TicketPayload;
    if (
      typeof payload.fileId !== "string" ||
      !/^[A-Za-z0-9_-]{10,200}$/.test(payload.fileId) ||
      typeof payload.token !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Math.floor(Date.now() / 1000)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (!origin || !allowedOrigins(env).has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "driveplay-media" }, 200, origin, env);
    }

    const metadataPrefix = "/api/drive/files/";
    const streamPrefix = "/api/drive/stream/";
    const sessionPrefix = "/api/drive/session/";
    const isMetadata = url.pathname.startsWith(metadataPrefix);
    const isStream = url.pathname.startsWith(streamPrefix);
    const isSession = url.pathname === "/api/drive/session";
    const isTicketStream = isStream && ["GET", "HEAD"].includes(request.method);

    if (isSession && request.method !== "POST") {
      return jsonResponse({ error: "Use POST to create a playback session." }, 405, origin, env);
    }
    if ((!isMetadata && !isTicketStream) || (isMetadata && request.method !== "GET" && request.method !== "HEAD")) {
      return jsonResponse({ error: "Not found." }, 404, origin, env);
    }

    if (isSession) {
      const token = getBearerToken(request);
      if (!token) return jsonResponse({ error: "Google authorization is required." }, 401, origin, env);
      try {
        const body = await request.json() as { fileId?: string };
        const fileId = body.fileId?.trim() ?? "";
        if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
          return jsonResponse({ error: "Invalid Google Drive file ID." }, 400, origin, env);
        }
        const metadataResponse = await getDriveFile(fileId, token);
        if (!metadataResponse.ok) {
          const status = [401, 403, 404].includes(metadataResponse.status) ? metadataResponse.status : 502;
          return jsonResponse({ error: "Google Drive denied access or could not return file metadata." }, status, origin, env);
        }
        const file = await metadataResponse.json() as {
          id?: string; name?: string; mimeType?: string; size?: string;
          capabilities?: { canDownload?: boolean };
        };
        if (file.capabilities?.canDownload !== true) {
          return jsonResponse({ error: "Google Drive does not permit downloading this file. Check sharing and download permissions." }, 403, origin, env);
        }
        const ticket = await createTicket(fileId, token, env.STREAM_ENCRYPTION_SECRET);
        return jsonResponse({
          id: file.id, name: file.name, mimeType: file.mimeType, size: file.size,
          canDownload: true,
          streamUrl: `${url.origin}/api/drive/stream/${encodeURIComponent(fileId)}?ticket=${encodeURIComponent(ticket)}`,
          expiresIn: TICKET_TTL_SECONDS,
        }, 200, origin, env);
      } catch (error) {
        const message = error instanceof Error && error.message.includes("STREAM_ENCRYPTION_SECRET")
          ? "Media worker is missing its stream encryption secret."
          : "Could not create an authorized playback session.";
        return jsonResponse({ error: message }, 500, origin, env);
      }
    }

    const prefix = isMetadata ? metadataPrefix : streamPrefix;
    const fileId = url.pathname.slice(prefix.length);
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
      return jsonResponse({ error: "Invalid Google Drive file ID." }, 400, origin, env);
    }

    let token: string | null;
    if (isMetadata) {
      token = getBearerToken(request);
      if (!token) return jsonResponse({ error: "Google authorization is required." }, 401, origin, env);
    } else {
      const ticket = url.searchParams.get("ticket");
      const payload = ticket ? await readTicket(ticket, env.STREAM_ENCRYPTION_SECRET) : null;
      if (!payload || payload.fileId !== fileId) {
        return jsonResponse({ error: "Playback session expired or invalid. Submit the link again." }, 401, origin, env);
      }
      token = payload.token;
    }

    try {
      if (isMetadata) {
        const response = await getDriveFile(fileId, token);
        if (!response.ok) {
          const status = [401, 403, 404].includes(response.status) ? response.status : 502;
          return jsonResponse({ error: "Google Drive denied access or could not return file metadata." }, status, origin, env);
        }
        const file = await response.json() as {
          id?: string; name?: string; mimeType?: string; size?: string;
          capabilities?: { canDownload?: boolean };
        };
        return jsonResponse({
          id: file.id, name: file.name, mimeType: file.mimeType,
          size: file.size, canDownload: file.capabilities?.canDownload ?? false,
        }, 200, origin, env);
      }

      const mediaHeaders = new Headers({ Authorization: `Bearer ${token}` });
      const range = request.headers.get("Range");
      if (range) mediaHeaders.set("Range", range);
      const mediaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        { method: request.method, headers: mediaHeaders },
      );
      if (![200, 206, 416].includes(mediaResponse.status)) {
        const denied = mediaResponse.status === 401 || mediaResponse.status === 403;
        return jsonResponse({ error: denied ? "Google Drive denied media access." : "Google Drive could not provide the video stream." }, denied ? mediaResponse.status : 502, origin, env);
      }

      const headers = corsHeaders(origin, env);
      for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag"]) {
        const value = mediaResponse.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set("Cache-Control", "private, no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(request.method === "HEAD" ? null : mediaResponse.body, {
        status: mediaResponse.status, headers,
      });
    } catch {
      return jsonResponse({ error: "Unable to contact Google Drive." }, 502, origin, env);
    }
  },
} satisfies ExportedHandler<Env>;
