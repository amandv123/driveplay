import { memo } from 'react';
import { Check } from 'lucide-react';
import type { PlayerController } from '../../lib/player/playerController';
import { usePlayerStore } from '../../store/playerStore';
import { IconButton } from './IconButton';

export const PlaybackSpeed = memo(function PlaybackSpeed({
  controller,
}: {
  controller: PlayerController;
}) {
  const rate = usePlayerStore((s) => s.playbackRate);
  const speeds = usePlayerStore((s) => s.availableSpeeds);
  const open = usePlayerStore((s) => s.openMenu === 'speed');
  const setOpenMenu = usePlayerStore((s) => s.setOpenMenu);

  return (
    <div className="relative" data-player-menu>
      <IconButton
        label="Playback speed"
        aria-haspopup="menu"
        aria-expanded={open}
        active={open}
        onClick={() => setOpenMenu(open ? null : 'speed')}
        className="text-sm font-semibold tabular-nums"
      >
        {rate}x
      </IconButton>
      {open && (
        <div
          role="menu"
          aria-label="Playback speed"
          className="absolute bottom-full right-0 mb-2 max-h-60 min-w-32 overflow-y-auto rounded-xl bg-neutral-900/95 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur"
        >
          {speeds.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === rate}
              onClick={() => {
                controller.setPlaybackRate(s);
                setOpenMenu(null);
              }}
              className="flex h-11 w-full items-center justify-between gap-4 rounded-lg px-3 text-sm text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white sm:h-9"
            >
              <span className="tabular-nums">{s === 1 ? 'Normal' : `${s}x`}</span>
              {s === rate && <Check size={16} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
