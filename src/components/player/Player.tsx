import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { PlayerController } from '../../lib/player/playerController';
import { attachShortcuts } from '../../lib/player/shortcuts';
import { DEFAULT_PLAYER_OPTIONS } from '../../lib/player/types';
import type { MediaSource, PlayerOptions, SubtitleTrack } from '../../lib/player/types';
import { usePlayerStore } from '../../store/playerStore';
import { PlayerControls } from './PlayerControls';
import { PlayerOverlay } from './PlayerOverlay';

export interface PlayerProps {
  /** Anything a <video> element can load. The player does not care where it came from. */
  source: MediaSource;
  options?: Partial<PlayerOptions>;
  subtitleTracks?: SubtitleTrack[];
  className?: string;
}

interface PressState {
  id: number;
  x: number;
  y: number;
  timer: number;
  held: boolean;
  moved: boolean;
}

/** Movement (px) after which a press becomes a swipe instead of a tap/hold. */
const MOVE_THRESHOLD = 10;

const getStore = () => usePlayerStore.getState();

export function Player({ source, options, subtitleTracks, className = '' }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressRef = useRef<PressState | null>(null);
  const hideTimerRef = useRef(0);
  const lastMoveRef = useRef(0);
  const [controller, setController] = useState<PlayerController | null>(null);

  const {
    skipSeconds,
    keyboardSeekSeconds,
    volumeStep,
    holdSpeed,
    holdDelayMs,
    controlsHideDelayMs,
    autoPlay,
  } = { ...DEFAULT_PLAYER_OPTIONS, ...options };

  const fullscreen = usePlayerStore((s) => s.fullscreen);
  const theaterMode = usePlayerStore((s) => s.theaterMode);
  const controlsVisible = usePlayerStore((s) => s.controlsVisible);
  const playing = usePlayerStore((s) => s.playing);
  const seeking = usePlayerStore((s) => s.seeking);
  const openMenu = usePlayerStore((s) => s.openMenu);

  /* ---- Controller lifecycle ---- */
  useLayoutEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const c = new PlayerController(video, container);
    let lastSecond = -1;

    const detach = c.attach({
      onEvent: (event, error) => getStore().applyMediaEvent(event, error),
      onDuration: (duration) => getStore().patch({ duration }),
      onTime: (time) => {
        const s = Math.floor(time);
        if (s !== lastSecond) {
          lastSecond = s;
          getStore().patch({ currentTime: s });
        }
      },
      onVolume: (volume, muted) => getStore().patch({ volume, muted }),
      onRate: (playbackRate) => getStore().patch({ playbackRate }),
      onSeeking: (isSeeking) =>
        getStore().patch(
          isSeeking
            ? { seeking: true }
            : { seeking: false, currentTime: Math.floor(c.currentTime) },
        ),
      onFullscreen: (active) => getStore().patch({ fullscreen: active }),
      onPiP: (active) => getStore().patch({ pictureInPicture: active }),
    });

    setController(c);

    return () => {
      detach();
      c.destroy();
      setController(null);
    };
  }, []);

  useEffect(() => {
    controller?.updateOptions({
      skipSeconds,
      keyboardSeekSeconds,
      volumeStep,
      holdSpeed,
    });
  }, [controller, skipSeconds, keyboardSeekSeconds, volumeStep, holdSpeed]);

  // Reset playback state when the media source changes.
  useEffect(() => {
    getStore().resetPlayback();
  }, [source.url]);

  useEffect(() => {
    getStore().setSubtitleTracks(subtitleTracks ?? []);
  }, [subtitleTracks]);

  /* ---- Controls visibility ---- */
  const scheduleHide = useCallback(() => {
    window.clearTimeout(hideTimerRef.current);

    hideTimerRef.current = window.setTimeout(() => {
      const s = getStore();

      if (s.playing && !s.seeking && s.openMenu === null && !s.error) {
        s.patch({ controlsVisible: false });
      }
    }, controlsHideDelayMs);
  }, [controlsHideDelayMs]);

  const showControls = useCallback(() => {
    if (!getStore().controlsVisible) {
      getStore().patch({ controlsVisible: true });
    }

    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (playing && openMenu === null && !seeking) {
      scheduleHide();
    } else {
      window.clearTimeout(hideTimerRef.current);
      getStore().patch({ controlsVisible: true });
    }
  }, [playing, openMenu, seeking, scheduleHide]);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimerRef.current);

      if (pressRef.current) {
        window.clearTimeout(pressRef.current.timer);
      }
    },
    [],
  );

  /* ---- Keyboard ---- */
  useEffect(() => {
    if (!controller) return;

    return attachShortcuts({
      controller,
      onToggleTheater: () => getStore().toggleTheater(),
      onEscape: () => getStore().setOpenMenu(null),
      onActivity: showControls,
    });
  }, [controller, showControls]);

  /* ---- Pointer: tap and press-and-hold 2x ---- */
  const handleTap = (pointerType: string) => {
    if (pointerType === 'touch') {
      const s = getStore();

      if (s.controlsVisible && s.playing) {
        s.patch({ controlsVisible: false });
      } else {
        showControls();
      }
    } else {
      controller?.togglePlay();
    }
  };

  const onSurfacePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    showControls();

    const timer = window.setTimeout(() => {
      const press = pressRef.current;
      if (!press) return;

      press.held = true;
      controller?.beginHoldSpeed();
      getStore().patch({ speedHold: true });
    }, holdDelayMs);

    pressRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      timer,
      held: false,
      moved: false,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSurfacePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;

    if (!press || press.id !== e.pointerId || press.moved) return;

    if (
      Math.hypot(e.clientX - press.x, e.clientY - press.y) >
      MOVE_THRESHOLD
    ) {
      press.moved = true;

      if (!press.held) {
        window.clearTimeout(press.timer);
      }
    }
  };

  const endPress = (
    e: PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const press = pressRef.current;

    if (!press || press.id !== e.pointerId) return;

    window.clearTimeout(press.timer);
    pressRef.current = null;

    if (press.held) {
      controller?.endHoldSpeed();
      getStore().patch({ speedHold: false });
      return;
    }

    if (!cancelled && !press.moved) {
      handleTap(e.pointerType);
    }
  };

  /* ---- Root handlers ---- */
  const onRootPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.timeStamp - lastMoveRef.current < 100) return;

    lastMoveRef.current = e.timeStamp;
    showControls();
  };

  const onRootPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (getStore().openMenu === null) return;

    if (
      e.target instanceof Element &&
      e.target.closest('[data-player-menu]')
    ) {
      return;
    }

    getStore().setOpenMenu(null);
  };

  const handleRetry = useCallback(() => {
    getStore().patch({
      error: null,
      loading: true,
      speedHold: false,
    });

    controller?.retry();
  }, [controller]);

  const handleTogglePlay = useCallback(
    () => controller?.togglePlay(),
    [controller],
  );

  const layout = fullscreen
    ? 'h-full w-full'
    : theaterMode
      ? 'aspect-video w-full'
      : 'aspect-video w-full max-w-4xl rounded-2xl';

  // Construct the original Google Drive viewer URL for the fallback action.
  const driveUrl = source.fileId
    ? `https://drive.google.com/file/d/${encodeURIComponent(source.fileId)}/view`
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative isolate mx-auto select-none overflow-hidden bg-black text-white ${layout} ${
        playing && !controlsVisible ? 'cursor-none' : ''
      } ${className}`}
      onPointerMove={onRootPointerMove}
      onPointerDown={onRootPointerDown}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') scheduleHide();
      }}
      onKeyDownCapture={showControls}
      onFocusCapture={showControls}
    >
      <video
        ref={videoRef}
        src={source.url}
        poster={source.poster}
        aria-label={source.title ?? 'Video'}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        className="absolute inset-0 h-full w-full bg-black object-contain"
      />

      <div
        className="absolute inset-0 touch-manipulation"
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onSurfacePointerMove}
        onPointerUp={(e) => endPress(e, false)}
        onPointerCancel={(e) => endPress(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      />

      <PlayerOverlay
        onRetry={handleRetry}
        onTogglePlay={handleTogglePlay}
        driveUrl={driveUrl}
      />

      {controller && (
        <div
          inert={!controlsVisible}
          className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200 motion-reduce:transition-none ${
            controlsVisible
              ? 'opacity-100'
              : 'pointer-events-none opacity-0'
          }`}
        >
          <PlayerControls
            controller={controller}
            skipSeconds={skipSeconds}
          />
        </div>
      )}
    </div>
  );
}