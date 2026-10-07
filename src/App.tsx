import { useState } from "react";
import { Play } from "lucide-react";
import { DriveInput } from "./components/DriveInput";
import { VideoProbe } from "./components/VideoProbe";
import { resolveGoogleDriveMedia } from "./lib/googleDriveResolver";

function App() {
  const [mediaUrl, setMediaUrl] = useState("");
  const [fileId, setFileId] = useState("");

  function handleDriveSubmit(id: string) {
    const result = resolveGoogleDriveMedia(id);

    if (!result.ok) {
      return;
    }

    setFileId(id);
    setMediaUrl(result.source.url);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center px-6 py-16">
        <div className="flex w-full flex-1 flex-col items-center justify-center text-center">
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

          <div className="mt-10 w-full">
            <DriveInput onSubmit={handleDriveSubmit} />
          </div>

          {fileId && mediaUrl && (
            <div className="mt-2 w-full max-w-4xl">
              <p className="mb-3 text-left text-xs text-white/30">
                File ID: {fileId}
              </p>

              <VideoProbe src={mediaUrl} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;

