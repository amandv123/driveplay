/**
 * Pure player logic: no DOM, no React, no store. Everything here is unit-testable.
 * This file must only use `import type` from other modules so tests can run it directly.
 */
import type { PlayerError } from './types';

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
export const DEFAULT_PLAYBACK_RATE = 1;

export const GENERIC_ERROR: PlayerError = {
  kind: 'unknown',
  message: 'Unable to play this video.',
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamps to 0..1. Non-finite input falls back to full volume. */
export function clampVolume(volume: number): number {
  return Number.isFinite(volume) ? clamp(volume, 0, 1) : 1;
}

/** Adds `delta` to `current`, clamped to 0..1 and rounded to 2 decimals (no float drift). */
export function stepVolume(current: number, delta: number): number {
  return Math.round(clampVolume(current + delta) * 100) / 100;
}

function hasDuration(duration: number): boolean {
  return Number.isFinite(duration) && duration > 0;
}

function safeRatio(ratio: number): number {
  return Number.isFinite(ratio) ? clamp(ratio, 0, 1) : 0;
}

/** Target time for a relative seek. Clamped to 0..duration; unbounded above if duration is unknown. */
export function computeSeekTarget(current: number, delta: number, duration: number): number {
  const target = current + delta;
  return hasDuration(duration) ? clamp(target, 0, duration) : Math.max(0, target);
}

export function ratioToTime(ratio: number, duration: number): number {
  return hasDuration(duration) ? safeRatio(ratio) * duration : 0;
}

export function timeToRatio(time: number, duration: number): number {
  return hasDuration(duration) ? safeRatio(time / duration) : 0;
}

/** Horizontal pointer position within an element, as 0..1. */
export function pointerRatio(clientX: number, left: number, width: number): number {
  return width > 0 ? safeRatio((clientX - left) / width) : 0;
}

export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const SPEEDS: readonly number[] = PLAYBACK_SPEEDS;

/** Snaps any rate to the closest supported speed. */
export function nearestSpeed(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_PLAYBACK_RATE;
  return SPEEDS.reduce(
    (best, s) => (Math.abs(s - rate) < Math.abs(best - rate) ? s : best),
    DEFAULT_PLAYBACK_RATE,
  );
}

/** Next faster (+1) or slower (-1) supported speed, stopping at the ends. */
export function stepSpeed(current: number, direction: 1 | -1): number {
  const index = SPEEDS.indexOf(nearestSpeed(current));
  return SPEEDS.at(clamp(index + direction, 0, SPEEDS.length - 1)) ?? DEFAULT_PLAYBACK_RATE;
}

/* ------------------------------------------------------------------ */
/* Playback state transitions                                          */
/* ------------------------------------------------------------------ */

export interface PlaybackFlags {
  loading: boolean;
  buffering: boolean;
  playing: boolean;
  ended: boolean;
  error: PlayerError | null;
}

export const INITIAL_FLAGS: PlaybackFlags = {
  loading: true,
  buffering: false,
  playing: false,
  ended: false,
  error: null,
};

export type MediaEventName =
  | 'loadstart'
  | 'loadedmetadata'
  | 'canplay'
  | 'waiting'
  | 'playing'
  | 'pause'
  | 'ended'
  | 'error';

/** Maps a native media event onto the UI flags. Pure: returns a new object. */
export function reduceMediaEvent(
  flags: PlaybackFlags,
  event: MediaEventName,
  error: PlayerError | null = null,
): PlaybackFlags {
  switch (event) {
    case 'loadstart':
      return { ...INITIAL_FLAGS };
    case 'loadedmetadata':
    case 'canplay':
      return { ...flags, loading: false, buffering: false };
    case 'waiting':
      // While the first load is in progress we only show "loading", not "buffering".
      return flags.loading ? flags : { ...flags, buffering: true };
    case 'playing':
      return { loading: false, buffering: false, playing: true, ended: false, error: null };
    case 'pause':
      return { ...flags, playing: false };
    case 'ended':
      return { ...flags, playing: false, buffering: false, ended: true };
    case 'error':
      return {
        loading: false,
        buffering: false,
        playing: false,
        ended: false,
        error: error ?? GENERIC_ERROR,
      };
  }
}
