import { memo } from 'react';
import { Pause, PictureInPicture2, Play, RotateCcw, RotateCw } from 'lucide-react';
import type { PlayerController } from '../../lib/player/playerController';
import { usePlayerStore } from '../../store/playerStore';
import { FullscreenButton } from './FullscreenButton';
import { IconButton } from './IconButton';
import { PlaybackSpeed } from './PlaybackSpeed';
import { ProgressBar } from './ProgressBar';
import { SettingsMenu } from './SettingsMenu';
import { TheaterButton } from './TheaterButton';
import { VolumeControl } from './VolumeControl';

function SkipIcon({ seconds, forward }: { seconds: number; forward: boolean }) {
  const Icon = forward ? RotateCw : RotateCcw;
  return (
    <span className="relative inline-flex" aria-hidden>
      <Icon size={26} />
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
        {seconds}
      </span>
    </span>
  );
}

export const PlayerControls = memo(function PlayerControls({
  controller,
  skipSeconds,
}: {
  controller: PlayerController;
  skipSeconds: number;
}) {
  const playing = usePlayerStore((s) => s.playing);
  const pip = usePlayerStore((s) => s.pictureInPicture);

  return (
    <div
      className="flex flex-col px-2 pb-2 pt-12 sm:px-4 sm:pb-3"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))' }}
    >
      <ProgressBar controller={controller} />
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <IconButton
            label={playing ? 'Pause' : 'Play'}
            onClick={() => controller.togglePlay()}
          >
            {playing ? <Pause size={24} aria-hidden /> : <Play size={24} aria-hidden />}
          </IconButton>
          <IconButton
            label={`Rewind ${skipSeconds} seconds`}
            onClick={() => controller.skipBackward()}
          >
            <SkipIcon seconds={skipSeconds} forward={false} />
          </IconButton>
          <IconButton
            label={`Forward ${skipSeconds} seconds`}
            onClick={() => controller.skipForward()}
          >
            <SkipIcon seconds={skipSeconds} forward />
          </IconButton>
        </div>
        <div className="flex items-center">
          <div className="hidden sm:block">
            <VolumeControl controller={controller} />
          </div>
          <PlaybackSpeed controller={controller} />
          <SettingsMenu />
          {controller.isPiPSupported && (
            <IconButton
              label={pip ? 'Exit picture-in-picture' : 'Picture-in-picture'}
              aria-pressed={pip}
              active={pip}
              onClick={() => void controller.togglePiP()}
              className="hidden sm:inline-flex"
            >
              <PictureInPicture2 size={22} aria-hidden />
            </IconButton>
          )}
          <TheaterButton />
          <FullscreenButton controller={controller} />
        </div>
      </div>
    </div>
  );
});
