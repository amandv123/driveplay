import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { DriveInput } from "./components/DriveInput";
import { Player } from "./components/player/Player";
import { DriveEmbed } from "./components/DriveEmbed";
import { resolveGoogleDriveMedia } from "./lib/googleDriveResolver";
import { requestGoogleDriveAccessToken } from "./lib/googleAuth";
import { createDrivePlaybackSession } from "./lib/driveApi";
import type { MediaSource } from "./lib/player/types";
import { usePlayerStore } from "./store/playerStore";

type PlaybackMode = "custom" | "embed";

function App() {
  const [source, setSource] = useState<MediaSource | null>(null);
  const [mode, setMode] = useState<PlaybackMode>("custom");
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const playerError = usePlayerStore((state) => state.error);

  useEffect(() => {
    if (mode === "custom" && source && playerError) {
      setPlaybackError(playerError.message);
    }
  }, [mode, source, playerError]);

  async function handleDriveSubmit(fileId: string) {
    const result = resolveGoogleDriveMedia(fileId);

    if (!result.ok) {
      setPlaybackError(result.error);
      return;
    }

    usePlayerStore.getState().resetPlayback();
    setSource(null);
    setPlaybackError(null);
    setMode("custom");

    try {
      const accessToken = await requestGoogleDriveAccessToken();
      const session = await createDrivePlaybackSession(result.source.fileId, accessToken);

      setSource({
        url: session.streamUrl,
        provider: result.source.provider,
        fileId: result.source.fileId,
        title: session.name || "DrivePlay video",
      });
    } catch (error) {
      setPlaybackError(
        error instanceof Error ? error.message : "Could not authorize Google Drive playback.",
      );
    }
  }

  function tryCustomPlayerAgain() {
    usePlayerStore.getState().resetPlayback();
    setPlaybackError(null);
    setMode("custom");
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
            A smooth, powerful video player for your Google Drive videos.
          </p>

          <div className="mx-auto mt-10 w-full">
            <DriveInput onSubmit={handleDriveSubmit} />
          </div>

          {playbackError && mode === "custom" && (
            <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center gap-3" role="status">
              <p className="text-sm text-amber-200/80">
                Custom playback could not load this video: {playbackError}
              </p>
              <button
                type="button"
                onClick={() => setMode("embed")}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/5"
              >
                Use Google Drive player instead
              </button>
            </div>
          )}

          {source && (
            <div className="mx-auto mt-8 w-full max-w-4xl">
              <p className="mb-3 text-left text-xs text-white/30">
                File ID: {source.fileId}
              </p>

              {mode === "custom" ? (
                <Player key={source.url} source={source} />
              ) : (
                <DriveEmbed
                  key={source.fileId}
                  fileId={source.fileId ?? ""}
                  title={source.title ?? "Google Drive video"}
                  onTryCustomPlayer={tryCustomPlayerAgain}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
