import { Maximize, Minimize } from 'lucide-react';
import type { PlayerController } from '../../lib/player/playerController';
import { usePlayerStore } from '../../store/playerStore';
import { IconButton } from './IconButton';

export function FullscreenButton({ controller }: { controller: PlayerController }) {
  const fullscreen = usePlayerStore((s) => s.fullscreen);
  if (!controller.isFullscreenSupported) return null;
  const Icon = fullscreen ? Minimize : Maximize;
  return (
    <IconButton
      label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      onClick={() => void controller.toggleFullscreen()}
    >
      <Icon size={22} aria-hidden />
    </IconButton>
  );
}
