import { useEffect, useRef, useState } from "react";

type VideoProbeProps = {
  src: string;
};

type ProbeState =
  | "loading"
  | "metadata"
  | "ready"
  | "playing"
  | "paused"
  | "error";

export function VideoProbe({ src }: VideoProbeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ProbeState>("loading");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setState("loading");
    setDuration(0);
    setError("");

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.load();

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  function handleLoadedMetadata() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setDuration(video.duration);
    setState("metadata");

    console.log("Video metadata loaded");
    console.log("Duration:", video.duration);
    console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);
  }

  function handleCanPlay() {
    setState("ready");
    console.log("Video can play");
  }

  function handlePlay() {
    setState("playing");
    console.log("Video playback started");
  }

  function handlePause() {
    setState("paused");
    console.log("Video playback paused");
  }

  function handleError() {
    const mediaError = videoRef.current?.error;

    setState("error");

    const message = mediaError
      ? `Media error ${mediaError.code}: ${mediaError.message || "Unknown media error"}`
      : "The video could not be loaded.";

    setError(message);
    console.error("DrivePlay media error:", mediaError);
  }

  return (
    <section className="mt-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
      <div className="aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onPlay={handlePlay}
          onPause={handlePause}
          onError={handleError}
        />
      </div>

      <div className="border-t border-white/10 px-4 py-3 text-left text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/50">Playback status</span>

          <span
            className={
              state === "error"
                ? "text-red-300"
                : state === "playing"
                  ? "text-white"
                  : "text-white/70"
            }
          >
            {state}
          </span>
        </div>

        {duration > 0 && (
          <p className="mt-1 text-xs text-white/35">
            Duration: {Math.round(duration)} seconds
          </p>
        )}

        {error && (
          <p className="mt-2 break-words text-xs text-red-300/80">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
