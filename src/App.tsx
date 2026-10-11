import { useState } from "react";
import { Play } from "lucide-react";
import { DriveInput } from "./components/DriveInput";
import { Player } from "./components/player/Player";
import { resolveGoogleDriveMedia } from "./lib/googleDriveResolver";
import type { MediaSource } from "./lib/player/types";
import { usePlayerStore } from "./store/playerStore";

function App() {
  const [source, setSource] = useState<MediaSource | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  async function handleDriveSubmit(fileId: string) {
    const result = resolveGoogleDriveMedia(fileId);

    if (!result.ok) {
      setPlaybackError(result.error);
      return;
    }

    usePlayerStore.getState().resetPlayback();
    setSource(null);
    setPlaybackError(null);

    // Public-first playback: no Google OAuth prompt and no embedded-player fallback.
    // Google Drive may deny direct media delivery for some files; we surface that
    // limitation instead of silently switching to a different player or requiring sign-in.
    setSource({
      url: result.source.url,
      provider: result.source.provider,
      fileId: result.source.fileId,
      title: "DrivePlay video",
    });
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
            A focused custom player for directly playable video links.
          </p>

          <div className="mx-auto mt-10 w-full">
            <DriveInput onSubmit={handleDriveSubmit} />
          </div>

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
