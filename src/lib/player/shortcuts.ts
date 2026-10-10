import type { PlayerController } from './playerController';

export interface ShortcutHandlers {
  controller: PlayerController;
  onToggleTheater: () => void;
  onEscape: () => void;
  /** Called after a handled shortcut so the UI can reveal the controls. */
  onActivity: () => void;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Window-level keyboard shortcuts. Ignored while typing and when a modifier is held.
 * A handler further down the tree (e.g. the progress bar) can claim a key by calling
 * preventDefault(); this listener then skips it.
 */
export function attachShortcuts(handlers: ShortcutHandlers): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;

    const el = e.target instanceof HTMLElement ? e.target : null;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === 'Escape') {
      handlers.onEscape();
      return;
    }
    if (el?.closest('[role="menu"]')) return;

    const { controller } = handlers;
    let handled = true;

    switch (key) {
      case ' ':
        // On a focused button, Space already means "click it".
        if (el?.closest('button, a')) return;
        if (!e.repeat) controller.togglePlay();
        break;
      case 'ArrowLeft':
        controller.seekByKeyboard(-1);
        break;
      case 'ArrowRight':
        controller.seekByKeyboard(1);
        break;
      case 'ArrowUp':
        controller.adjustVolume(1);
        break;
      case 'ArrowDown':
        controller.adjustVolume(-1);
        break;
      case 'm':
        if (!e.repeat) controller.toggleMute();
        break;
      case 'f':
        if (!e.repeat) void controller.toggleFullscreen();
        break;
      case 't':
        if (!e.repeat) handlers.onToggleTheater();
        break;
      case 'p':
        if (!e.repeat) void controller.togglePiP();
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      handlers.onActivity();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
