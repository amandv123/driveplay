import { ExternalLink } from 'lucide-react';

interface DriveEmbedProps {
  fileId: string;
  title?: string;
  onTryCustomPlayer?: () => void;
}

export function DriveEmbed({
  fileId,
  title = 'Google Drive video',
  onTryCustomPlayer,
}: DriveEmbedProps) {
  const embedUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
  const viewerUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#090909] text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="text-left">
          <p className="text-sm font-medium">Google Drive Player</p>
          <p className="mt-1 text-xs text-white/50">
            Using Google’s embedded video player
          </p>
        </div>

        <a
          href={viewerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
        >
          Open in Drive
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>

      <div className="aspect-video w-full bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
        />
      </div>

      {onTryCustomPlayer && (
        <div className="flex justify-end border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onTryCustomPlayer}
            className="rounded-full px-4 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"
          >
            Try custom player again
          </button>
        </div>
      )}
    </section>
  );
}