/**
 * Shared player types. Nothing here knows about Google Drive or any other
 * provider: the player only ever needs a playable URL.
 */

/** Informational only. The player never branches on this value. */
export type MediaProvider = 'google-drive' | 'dropbox' | 'onedrive' | 'direct';

export interface MediaSource {
  /** A URL the native <video> element can load. */
  url: string;
  provider?: MediaProvider;
  /** Provider-specific id (e.g. Drive file id). Carried along for future use. */
  fileId?: string;
  title?: string;
  poster?: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language?: string;
  /** WebVTT URL. Rendering is not implemented yet. */
  src?: string;
}

export type PlayerErrorKind = 'network' | 'decode' | 'unsupported' | 'aborted' | 'unknown';

export interface PlayerError {
  kind: PlayerErrorKind;
  /** Safe to show to the user. Never contains technical details. */
  message: string;
}

export interface PlayerOptions {
  /** Rewind / forward button step, in seconds. */
  skipSeconds: number;
  /** Arrow-key seek step, in seconds. */
  keyboardSeekSeconds: number;
  /** Arrow-key volume step (0 to 1). */
  volumeStep: number;
  /** Temporary speed while pressing and holding the video. */
  holdSpeed: number;
  /** How long a press must last before it counts as a hold. */
  holdDelayMs: number;
  /** Inactivity delay before controls hide during playback. */
  controlsHideDelayMs: number;
  autoPlay: boolean;
}

export const DEFAULT_PLAYER_OPTIONS: PlayerOptions = {
  skipSeconds: 10,
  keyboardSeekSeconds: 5,
  volumeStep: 0.05,
  holdSpeed: 2,
  holdDelayMs: 350,
  controlsHideDelayMs: 3000,
  autoPlay: false,
};
