import { memo, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { PlayerController } from '../../lib/player/playerController';
import { formatTime, pointerRatio, ratioToTime, timeToRatio } from '../../lib/player/playerMath';
import { usePlayerStore } from '../../store/playerStore';

/**
 * The only component that follows the playhead frame by frame, and it does so
 * WITHOUT React state: a requestAnimationFrame loop (only while playing) writes CSS
 * variables and text nodes directly. React never re-renders because of playback progress.
 *
 * Dragging only moves the visual playhead; the real seek happens once on release,
 * which keeps range-based sources from being hammered with seeks.
 */
export const ProgressBar = memo(function ProgressBar({
  controller,
}: {
  controller: PlayerController;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const dragRatioRef = useRef(0);
  const paintRef = useRef<() => void>(() => {});
  const playing = usePlayerStore((s) => s.playing);

  useEffect(() => {
    let lastP = '';
    let lastB = '';
    let lastText = '';
    let lastTotal = '';

    const paint = () => {
      const slider = sliderRef.current;
      if (!slider) return;
      const duration = controller.duration;
      const dragging = draggingRef.current;
      const ratio = dragging ? dragRatioRef.current : timeToRatio(controller.currentTime, duration);
      const time = dragging ? ratioToTime(ratio, duration) : controller.currentTime;

      const p = ratio.toFixed(4);
      if (p !== lastP) {
        lastP = p;
        slider.style.setProperty('--p', p);
      }
      const b = timeToRatio(controller.bufferedEnd, duration).toFixed(4);
      if (b !== lastB) {
        lastB = b;
        slider.style.setProperty('--b', b);
      }

      const text = formatTime(time);
      if (text !== lastText) {
        lastText = text;
        if (currentRef.current) currentRef.current.textContent = text;
        slider.setAttribute('aria-valuenow', String(Math.floor(time)));
        slider.setAttribute('aria-valuetext', `${text} of ${formatTime(duration)}`);
      }
      const total = formatTime(duration);
      if (total !== lastTotal) {
        lastTotal = total;
        if (durationRef.current) durationRef.current.textContent = total;
        slider.setAttribute('aria-valuemax', String(Math.floor(duration)));
      }
    };
    paintRef.current = paint;

    const v = controller.video;
    const events = ['seeked', 'durationchange', 'loadedmetadata', 'progress', 'emptied'];
    for (const e of events) v.addEventListener(e, paint);

    let raf = 0;
    const tick = () => {
      paint();
      raf = requestAnimationFrame(tick);
    };
    if (playing) raf = requestAnimationFrame(tick);
    else paint();

    return () => {
      cancelAnimationFrame(raf);
      for (const e of events) v.removeEventListener(e, paint);
    };
  }, [controller, playing]);

  const ratioFrom = (e: PointerEvent<HTMLDivElement>): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return pointerRatio(e.clientX, rect.left, rect.width);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    dragRatioRef.current = ratioFrom(e);
    usePlayerStore.getState().patch({ seeking: true });
    paintRef.current();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    dragRatioRef.current = ratioFrom(e);
    paintRef.current();
  };

  const finishDrag = (commit: boolean) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (commit) controller.seekToRatio(dragRatioRef.current);
    usePlayerStore.getState().patch({ seeking: false });
    paintRef.current();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        controller.seekByKeyboard(-1);
        break;
      case 'ArrowRight':
        controller.seekByKeyboard(1);
        break;
      case 'Home':
        controller.seekTo(0);
        break;
      case 'End':
        controller.seekToRatio(1);
        break;
      default:
        return;
    }
    // Claim the key so the window-level shortcut handler doesn't seek twice.
    e.preventDefault();
  };

  return (
    <div className="flex items-center gap-3 text-xs tabular-nums text-white/90 sm:text-sm">
      <span ref={currentRef} className="min-w-9 text-right">
        0:00
      </span>
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => finishDrag(true)}
        onPointerCancel={() => finishDrag(false)}
        onKeyDown={onKeyDown}
        className="group relative flex h-10 flex-1 cursor-pointer touch-none items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <div
          ref={trackRef}
          className="relative h-1 w-full rounded-full bg-white/25 transition-[height] group-hover:h-1.5 group-focus-visible:h-1.5 motion-reduce:transition-none"
        >
          <div
            className="absolute inset-0 origin-left rounded-full bg-white/35"
            style={{ transform: 'scaleX(var(--b, 0))' }}
          />
          <div
            className="absolute inset-0 origin-left rounded-full bg-white"
            style={{ transform: 'scaleX(var(--p, 0))' }}
          />
          <div
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: 'calc(var(--p, 0) * 100%)' }}
          />
        </div>
      </div>
      <span ref={durationRef} className="min-w-9 text-white/70">
        0:00
      </span>
    </div>
  );
});
