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
