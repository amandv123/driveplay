import type { MediaResolveResult } from "./mediaResolver";

export function resolveGoogleDriveMedia(
  fileId: string,
): MediaResolveResult {
  const cleanId = fileId.trim();

  if (!cleanId) {
    return {
      ok: false,
      error: "Missing Google Drive file ID.",
    };
  }

  return {
    ok: true,
    source: {
      url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(cleanId)}`,
      provider: "google-drive",
      fileId: cleanId,
    },
  };
}
