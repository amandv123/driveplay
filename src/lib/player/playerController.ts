/**
 * A thin, framework-free wrapper around an HTMLVideoElement.
 * It does not import React or the store; the UI feeds it a video element and
 * subscribes to changes through `attach()`.
 */
import { DEFAULT_PLAYER_OPTIONS } from './types';
import type { PlayerError, PlayerOptions } from './types';
import {
  GENERIC_ERROR,
  clampVolume,
  computeSeekTarget,
  nearestSpeed,
  ratioToTime,
  stepVolume,
} from './playerMath';
import type { MediaEventName } from './playerMath';

export interface PlayerListeners {
  onEvent?: (event: MediaEventName, error?: PlayerError) => void;
  onDuration?: (duration: number) => void;
  /** Fires on every native `timeupdate`. Throttle before putting this in React state. */
  onTime?: (time: number) => void;
  onVolume?: (volume: number, muted: boolean) => void;
  onRate?: (rate: number) => void;
  onSeeking?: (seeking: boolean) => void;
  onFullscreen?: (active: boolean) => void;
  onPiP?: (active: boolean) => void;
}

/** iOS Safari exposes fullscreen on the video element only. */
interface WebkitVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
}

export class PlayerController {
  readonly video: HTMLVideoElement;
  private readonly container: HTMLElement;
  private options: PlayerOptions;
  /** Playback rate to restore after a press-and-hold; null when not holding. */
  private heldRate: number | null = null;

  constructor(
    video: HTMLVideoElement,
    container: HTMLElement,
    options: Partial<PlayerOptions> = {},
  ) {
    this.video = video;
    this.container = container;
    this.options = { ...DEFAULT_PLAYER_OPTIONS, ...options };
  }

  updateOptions(options: Partial<PlayerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /* ---- Reads (cheap, safe to call from requestAnimationFrame) ---- */

  get currentTime(): number {
    return this.video.currentTime;
  }

  /** 0 when unknown or infinite. */
  get duration(): number {
    const d = this.video.duration;
    return Number.isFinite(d) ? d : 0;
  }

  /** End of the buffered range that contains the playhead, or 0. */
  get bufferedEnd(): number {
    const { buffered, currentTime } = this.video;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime + 0.1 && currentTime <= buffered.end(i)) {
        return buffered.end(i);
      }
    }
    return 0;
  }

  /* ---- Playback ---- */

  async play(): Promise<void> {
    try {
      await this.video.play();
    } catch {
      // Autoplay policy rejections and interrupted loads are expected.
      // Real failures arrive through the element's `error` event.
    }
  }

  pause(): void {
    this.video.pause();
  }

  togglePlay(): void {
    if (this.video.paused || this.video.ended) void this.play();
    else this.pause();
  }

  /** Reloads the current source and resumes from where playback stopped. */
  retry(): void {
    this.endHoldSpeed();
    const resumeAt = this.video.currentTime;
    const rate = this.video.playbackRate;
    this.video.addEventListener(
      'loadedmetadata',
      () => {
        this.video.playbackRate = rate; // load() resets it
        if (resumeAt > 0) this.video.currentTime = resumeAt;
        void this.play();
      },
      { once: true },
    );
    this.video.load();
  }

  /* ---- Seeking ---- */

  seekTo(time: number): void {
    this.video.currentTime = computeSeekTarget(time, 0, this.duration);
  }

  seekToRatio(ratio: number): void {
    this.seekTo(ratioToTime(ratio, this.duration));
  }

  skip(delta: number): void {
    this.video.currentTime = computeSeekTarget(this.video.currentTime, delta, this.duration);
  }

  skipForward(seconds: number = this.options.skipSeconds): void {
    this.skip(seconds);
  }

  skipBackward(seconds: number = this.options.skipSeconds): void {
    this.skip(-seconds);
  }

  seekByKeyboard(direction: 1 | -1): void {
    this.skip(direction * this.options.keyboardSeekSeconds);
  }

  /* ---- Volume ---- */

  /** Setting a volume above 0 also unmutes. (iOS Safari ignores programmatic volume.) */
  setVolume(volume: number): void {
    const v = clampVolume(volume);
    this.video.volume = v;
    if (v > 0 && this.video.muted) this.video.muted = false;
  }

  adjustVolume(direction: 1 | -1): void {
    this.setVolume(stepVolume(this.video.volume, direction * this.options.volumeStep));
  }

  toggleMute(): void {
    const willUnmute = this.video.muted;
    this.video.muted = !willUnmute;
    if (willUnmute && this.video.volume === 0) this.video.volume = 0.5;
  }

  /* ---- Speed ---- */

  /** While a hold is active this changes the speed that will be restored on release. */
  setPlaybackRate(rate: number): void {
    const next = nearestSpeed(rate);
    if (this.heldRate !== null) this.heldRate = next;
    else this.video.playbackRate = next;
  }

  beginHoldSpeed(): void {
    if (this.heldRate !== null) return;
    this.heldRate = this.video.playbackRate;
    this.video.playbackRate = this.options.holdSpeed;
  }

  endHoldSpeed(): void {
    if (this.heldRate === null) return;
    const restore = this.heldRate;
    this.heldRate = null;
    this.video.playbackRate = restore;
  }

  /* ---- Fullscreen ---- */

  get isFullscreenSupported(): boolean {
    return (
      typeof this.container.requestFullscreen === 'function' ||
      typeof (this.video as WebkitVideoElement).webkitEnterFullscreen === 'function'
    );
  }

  get isFullscreen(): boolean {
    return (
      document.fullscreenElement === this.container ||
      Boolean((this.video as WebkitVideoElement).webkitDisplayingFullscreen)
    );
  }

  async enterFullscreen(): Promise<void> {
    try {
      if (typeof this.container.requestFullscreen === 'function') {
        await this.container.requestFullscreen();
      } else {
        (this.video as WebkitVideoElement).webkitEnterFullscreen?.();
      }
    } catch {
      // Denied by the browser (no user gesture, policy). Nothing to do.
    }
  }

  async exitFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else (this.video as WebkitVideoElement).webkitExitFullscreen?.();
    } catch {
      // Ignore.
    }
  }

  toggleFullscreen(): Promise<void> {
    return this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
  }

  /* ---- Picture-in-Picture ---- */

  get isPiPSupported(): boolean {
    return Boolean(document.pictureInPictureEnabled) && !this.video.disablePictureInPicture;
  }

  async enterPiP(): Promise<void> {
    if (!this.isPiPSupported || document.pictureInPictureElement === this.video) return;
    try {
      await this.video.requestPictureInPicture();
    } catch {
      // Not allowed right now (e.g. metadata not loaded). Ignore.
    }
  }

  async exitPiP(): Promise<void> {
    if (!document.pictureInPictureElement) return;
    try {
      await document.exitPictureInPicture();
    } catch {
      // Ignore.
    }
  }

  togglePiP(): Promise<void> {
    return document.pictureInPictureElement === this.video ? this.exitPiP() : this.enterPiP();
  }

  /* ---- Events ---- */

  /** Subscribes to native media events. Returns a function that removes every listener. */
  attach(listeners: PlayerListeners): () => void {
    const v = this.video;
    const l = listeners;
    const cleanups: Array<() => void> = [];
    const on = (target: EventTarget, type: string, fn: () => void) => {
      target.addEventListener(type, fn);
      cleanups.push(() => target.removeEventListener(type, fn));
    };

    for (const type of ['canplay', 'waiting', 'playing', 'pause', 'ended'] as const) {
      on(v, type, () => l.onEvent?.(type));
    }
    on(v, 'loadstart', () => {
      l.onEvent?.('loadstart');
      l.onDuration?.(this.duration);
    });
    on(v, 'loadedmetadata', () => {
      l.onEvent?.('loadedmetadata');
      l.onDuration?.(this.duration);
    });
    on(v, 'durationchange', () => l.onDuration?.(this.duration));
    on(v, 'error', () => l.onEvent?.('error', this.readError()));
    on(v, 'timeupdate', () => l.onTime?.(v.currentTime));
    on(v, 'seeking', () => l.onSeeking?.(true));
    on(v, 'seeked', () => l.onSeeking?.(false));
    on(v, 'volumechange', () => l.onVolume?.(v.volume, v.muted));
    on(v, 'ratechange', () => l.onRate?.(this.heldRate ?? v.playbackRate));
    on(document, 'fullscreenchange', () => l.onFullscreen?.(this.isFullscreen));
    on(v, 'webkitbeginfullscreen', () => l.onFullscreen?.(true));
    on(v, 'webkitendfullscreen', () => l.onFullscreen?.(false));
    on(v, 'enterpictureinpicture', () => l.onPiP?.(true));
    on(v, 'leavepictureinpicture', () => l.onPiP?.(false));

    // Bring listeners in line with the element's current state.
    l.onVolume?.(v.volume, v.muted);
    l.onRate?.(v.playbackRate);
    l.onDuration?.(this.duration);
    if (v.readyState >= 1) l.onEvent?.('loadedmetadata');

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }

  destroy(): void {
    this.endHoldSpeed();
  }

  /** Converts the element's MediaError into a user-safe message. No technical details leak. */
  private readError(): PlayerError {
    switch (this.video.error?.code) {
      case 1:
        return { kind: 'aborted', message: GENERIC_ERROR.message };
      case 2:
        return {
          kind: 'network',
          message: 'Unable to play this video. Check your connection and try again.',
        };
      case 3:
        return { kind: 'decode', message: GENERIC_ERROR.message };
      case 4:
        return {
          kind: 'unsupported',
          message: 'This video format isn’t supported by your browser.',
        };
      default:
        return GENERIC_ERROR;
    }
  }
}
