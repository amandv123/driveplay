import { memo } from 'react';
import { ExternalLink, LoaderCircle, Play, RotateCw, TriangleAlert } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';

/** Centered status UI: loading, buffering, error with retry, paused play button, 2x hold badge. */
export const PlayerOverlay = memo(function PlayerOverlay({
  onRetry,
  onTogglePlay,
  driveUrl,
}: {
  onRetry: () => void;
  onTogglePlay: () => void;
  driveUrl?: string;
}) {
  const error = usePlayerStore((s) => s.error);
  const loading = usePlayerStore((s) => s.loading);
  const buffering = usePlayerStore((s) => s.buffering);
  const playing = usePlayerStore((s) => s.playing);
  const speedHold = usePlayerStore((s) => s.speedHold);

  const busy = !error && (loading || buffering);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      {error && (
        <div
          role="alert"
          className="pointer-events-auto mx-4 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-black/90 px-6 py-6 text-center ring-1 ring-white/10"
        >
          <TriangleAlert size={32} className="text-white/80" aria-hidden />
          <p className="text-base text-white">{error.message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <RotateCw size={16} aria-hidden />
            Try again
          </button>

          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ExternalLink size={16} aria-hidden />
              Open in Google Drive
            </a>
          )}
        </div>
      )}

      {busy && (
        <div role="status" aria-label={loading ? 'Loading video' : 'Buffering'}>
          <LoaderCircle
            size={48}
            className="animate-spin text-white/90 motion-reduce:animate-none"
            aria-hidden
          />
        </div>
      )}

      {!error && !busy && !playing && (
        <button
          type="button"
          aria-label="Play"
          onClick={onTogglePlay}
          className="pointer-events-auto inline-flex size-16 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-20"
        >
          <Play size={32} className="translate-x-0.5" aria-hidden />
        </button>
      )}

      {speedHold && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white">
          2x speed
        </div>
      )}
    </div>
  );
});