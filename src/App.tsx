import { useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { DriveInput } from "./components/DriveInput";
import { Player } from "./components/player/Player";
import { resolveGoogleDriveMedia } from "./lib/googleDriveResolver";
import type { MediaSource } from "./lib/player/types";
import { usePlayerStore } from "./store/playerStore";

function App() {
  const [source, setSource] = useState<MediaSource | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  async function handleDriveSubmit(fileId: string) {
    const result = resolveGoogleDriveMedia(fileId);

    if (!result.ok) {
      setPlaybackError(result.error);
      return;
    }

    const mediaApiUrl = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/+$/, "");
    if (!mediaApiUrl) {
      setPlaybackError("Media server is not configured. Set VITE_MEDIA_API_URL and try again.");
      return;
    }

    usePlayerStore.getState().resetPlayback();
    setSource(null);
    setPlaybackError(null);
    setPreparing(true);

    try {
      // Probe the same anonymous byte-stream path used by playback. A one-byte
      // Range request avoids downloading the full file and is more reliable than HEAD on Drive.
      const streamUrl = `${mediaApiUrl}/api/public/stream/${encodeURIComponent(result.source.fileId)}`;
      const response = await fetch(streamUrl, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "This Drive link cannot be streamed anonymously. Make sure sharing is set to Anyone with the link and downloading is allowed.";
        try {
          const body = await response.json() as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // Keep the readable default message if the response has no JSON body.
        }
        throw new Error(message);
      }

      const type = response.headers.get("Content-Type") ?? "";
      if (type.toLowerCase().includes("text/html")) {
        throw new Error("Google Drive returned a web page instead of video bytes. This file is not directly streamable.");
      }

      // The probe only needs response headers; cancel its tiny response body before playback.
      await response.body?.cancel();

      setSource({
        url: streamUrl,
        provider: result.source.provider,
        fileId: result.source.fileId,
        title: "DrivePlay video",
      });
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "Could not prepare this video stream.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 py-16">
        <div className="mx-auto flex w-full flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black shadow-2xl">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </div>

          <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-white/50">
            DrivePlay
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            A Better Way to Watch.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
            Paste a public Google Drive link. DrivePlay prepares a stream for its custom player.
          </p>

          <div className="mx-auto mt-10 w-full">
            <DriveInput onSubmit={handleDriveSubmit} />
          </div>

          {preparing && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-white/70" role="status" aria-live="polite">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
              <span>Preparing video stream… checking public access and connecting to the media server.</span>
            </div>
          )}

          {playbackError && (
            <p className="mx-auto mt-6 w-full max-w-2xl text-sm text-amber-200/80" role="alert">
              {playbackError}
            </p>
          )}

          {source && (
            <div className="mx-auto mt-8 w-full max-w-4xl">
              <p className="mb-3 text-left text-xs text-white/30">
                File ID: {source.fileId}
              </p>
              <Player key={source.url} source={source} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
