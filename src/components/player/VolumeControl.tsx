import { memo } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import type { PlayerController } from '../../lib/player/playerController';
import { usePlayerStore } from '../../store/playerStore';
import { IconButton } from './IconButton';

export const VolumeControl = memo(function VolumeControl({
  controller,
}: {
  controller: PlayerController;
}) {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const level = muted ? 0 : volume;
  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  return (
    <div className="group/volume flex items-center">
      <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={() => controller.toggleMute()}>
        <Icon size={22} aria-hidden />
      </IconButton>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        aria-label="Volume"
        onChange={(e) => controller.setVolume(Number(e.target.value))}
        className="h-1 w-0 cursor-pointer accent-white opacity-0 transition-[width,opacity] focus-visible:w-20 focus-visible:opacity-100 group-focus-within/volume:w-20 group-focus-within/volume:opacity-100 group-hover/volume:w-20 group-hover/volume:opacity-100 motion-reduce:transition-none"
      />
    </div>
  );
});
