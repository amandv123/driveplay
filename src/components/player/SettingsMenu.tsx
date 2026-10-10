import { memo } from 'react';
import { Check, Minus, Plus, Settings } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { IconButton } from './IconButton';

const itemClass =
  'flex h-11 w-full items-center justify-between gap-4 rounded-lg px-3 text-sm text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white sm:h-9';

/**
 * Foundation only: subtitle state and offset live in the store, but no subtitle
 * rendering exists yet, so the list is empty until tracks are supplied and rendered.
 */
export const SettingsMenu = memo(function SettingsMenu() {
  const open = usePlayerStore((s) => s.openMenu === 'settings');
  const tracks = usePlayerStore((s) => s.subtitleTracks);
  const selected = usePlayerStore((s) => s.selectedSubtitleId);
  const offset = usePlayerStore((s) => s.subtitleOffset);
  const setOpenMenu = usePlayerStore((s) => s.setOpenMenu);
  const selectSubtitle = usePlayerStore((s) => s.selectSubtitle);
  const setSubtitleOffset = usePlayerStore((s) => s.setSubtitleOffset);

  return (
    <div className="relative" data-player-menu>
      <IconButton
        label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        active={open}
        onClick={() => setOpenMenu(open ? null : 'settings')}
      >
        <Settings size={22} aria-hidden />
      </IconButton>
      {open && (
        <div
          role="menu"
          aria-label="Settings"
          className="absolute bottom-full right-0 mb-2 max-h-72 min-w-56 overflow-y-auto rounded-xl bg-neutral-900/95 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur"
        >
          <p className="px-3 pb-1 pt-2 text-xs text-white/60">Subtitles</p>
          {tracks.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-white/50">No subtitles available</p>
          ) : (
            <>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selected === null}
                onClick={() => selectSubtitle(null)}
                className={itemClass}
              >
                <span>Off</span>
                {selected === null && <Check size={16} aria-hidden />}
              </button>
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected === t.id}
                  onClick={() => selectSubtitle(t.id)}
                  className={itemClass}
                >
                  <span>{t.label}</span>
                  {selected === t.id && <Check size={16} aria-hidden />}
                </button>
              ))}
              {selected !== null && (
                <div className="flex items-center justify-between gap-4 px-3 py-1 text-sm text-white/90">
                  <span>Timing</span>
                  <span className="flex items-center gap-1">
                    <IconButton
                      label="Show subtitles earlier"
                      onClick={() => setSubtitleOffset(offset - 0.5)}
                    >
                      <Minus size={16} aria-hidden />
                    </IconButton>
                    <span className="min-w-12 text-center tabular-nums">
                      {offset > 0 ? '+' : ''}
                      {offset.toFixed(1)}s
                    </span>
                    <IconButton
                      label="Show subtitles later"
                      onClick={() => setSubtitleOffset(offset + 0.5)}
                    >
                      <Plus size={16} aria-hidden />
                    </IconButton>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});
