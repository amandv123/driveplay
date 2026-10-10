export type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  canDownload: boolean;
};

export async function getDriveFileMetadata(
  fileId: string,
  accessToken: string,
): Promise<DriveFileMetadata> {
  const baseUrl = import.meta.env.VITE_MEDIA_API_URL;

  if (!baseUrl) {
    throw new Error("Media API URL is not configured.");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/api/drive/files/${encodeURIComponent(fileId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Google access token is missing or expired. Sign in again.");
    }

    if (response.status === 403) {
      throw new Error("Google Drive denied access. Check your account permissions.");
    }

    if (response.status === 404) {
      throw new Error("The file was not found or is not accessible.");
    }

    throw new Error(`Could not retrieve Drive file metadata (HTTP ${response.status}).`);
  }

  return await response.json() as DriveFileMetadata;
}


export type DrivePlaybackSession = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  canDownload: boolean;
  streamUrl: string;
  expiresIn: number;
};

export async function createDrivePlaybackSession(
  fileId: string,
  accessToken: string,
): Promise<DrivePlaybackSession> {
  const baseUrl = import.meta.env.VITE_MEDIA_API_URL;
  if (!baseUrl) {
    throw new Error("Media API URL is not configured. Set VITE_MEDIA_API_URL in your local environment.");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/api/drive/session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = `Could not prepare video playback (HTTP ${response.status}).`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  return await response.json() as DrivePlaybackSession;
}
