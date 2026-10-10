/**
 * Low-frequency player state. Per-frame values (playhead position, buffered range)
 * deliberately live OUTSIDE this store: ProgressBar reads them straight from the
 * controller and paints the DOM directly. `currentTime` here is whole seconds only.
 *
 * `paused` is not stored: it is simply `!playing`.
 * One store means one active player per page.
 */
import { create } from 'zustand';
import { INITIAL_FLAGS, PLAYBACK_SPEEDS, clamp, reduceMediaEvent } from '../lib/player/playerMath';
import type { MediaEventName } from '../lib/player/playerMath';
import type { PlayerError, SubtitleTrack } from '../lib/player/types';

export type PlayerMenu = 'speed' | 'settings' | null;

export interface PlayerData {
  playing: boolean;
  loading: boolean;
  buffering: boolean;
  ended: boolean;
  error: PlayerError | null;

  /** Whole seconds, updated at most once per second. */
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  availableSpeeds: readonly number[];
  /** True while a press-and-hold temporary speed is active. */
  speedHold: boolean;
  /** True while the user scrubs or the element reports `seeking`. */
  seeking: boolean;

  fullscreen: boolean;
  theaterMode: boolean;
  pictureInPicture: boolean;

  controlsVisible: boolean;
  openMenu: PlayerMenu;

  subtitleTracks: SubtitleTrack[];
  selectedSubtitleId: string | null;
  /** Seconds. Positive shows subtitles later. */
  subtitleOffset: number;
}

export interface PlayerActions {
  patch: (partial: Partial<PlayerData>) => void;
  applyMediaEvent: (event: MediaEventName, error?: PlayerError) => void;
  /** Clears per-video state for a new source; keeps user preferences (volume, speed, theater). */
  resetPlayback: () => void;
  toggleTheater: () => void;
  setOpenMenu: (menu: PlayerMenu) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  selectSubtitle: (id: string | null) => void;
  setSubtitleOffset: (seconds: number) => void;
}

export type PlayerState = PlayerData & PlayerActions;

const initialData: PlayerData = {
  ...INITIAL_FLAGS,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  availableSpeeds: PLAYBACK_SPEEDS,
  speedHold: false,
  seeking: false,
  fullscreen: false,
  theaterMode: false,
  pictureInPicture: false,
  controlsVisible: true,
  openMenu: null,
  subtitleTracks: [],
  selectedSubtitleId: null,
  subtitleOffset: 0,
};

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  ...initialData,

  patch: (partial) => set(partial),

  applyMediaEvent: (event, error) => {
    const { loading, buffering, playing, ended, error: current } = get();
    set(reduceMediaEvent({ loading, buffering, playing, ended, error: current }, event, error ?? null));
  },

  resetPlayback: () =>
    set({
      ...INITIAL_FLAGS,
      currentTime: 0,
      duration: 0,
      speedHold: false,
      seeking: false,
      pictureInPicture: false,
      controlsVisible: true,
      openMenu: null,
    }),

  toggleTheater: () => set((s) => ({ theaterMode: !s.theaterMode })),

  setOpenMenu: (menu) => set({ openMenu: menu }),

  setSubtitleTracks: (tracks) =>
    set((s) => ({
      subtitleTracks: tracks,
      selectedSubtitleId: tracks.some((t) => t.id === s.selectedSubtitleId)
        ? s.selectedSubtitleId
        : null,
    })),

  selectSubtitle: (id) => set({ selectedSubtitleId: id }),

  setSubtitleOffset: (seconds) =>
    set({ subtitleOffset: Math.round(clamp(seconds, -30, 30) * 10) / 10 }),
}));
