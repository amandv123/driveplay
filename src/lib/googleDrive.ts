export type DriveFileResult =
  | { ok: true; fileId: string }
  | { ok: false; error: string };

const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "www.drive.google.com",
]);

export function extractDriveFileId(input: string): DriveFileResult {
  const value = input.trim();

  if (!value) {
    return {
      ok: false,
      error: "Please enter a Google Drive video link.",
    };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      error: "Please enter a valid URL.",
    };
  }

  if (!DRIVE_HOSTS.has(url.hostname.toLowerCase())) {
    return {
      ok: false,
      error: "Please use a Google Drive link.",
    };
  }

  const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);

  if (filePathMatch?.[1]) {
    return {
      ok: true,
      fileId: decodeURIComponent(filePathMatch[1]),
    };
  }

  const queryId = url.searchParams.get("id");

  if (queryId) {
    return {
      ok: true,
      fileId: queryId,
    };
  }

  return {
    ok: false,
    error: "Could not find a Drive file ID in this link.",
  };
}
