import { RectangleHorizontal } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { IconButton } from './IconButton';

/** Desktop only: toggles a wider layout. The parent page decides how wide "wide" can be. */
export function TheaterButton() {
  const theater = usePlayerStore((s) => s.theaterMode);
  const toggle = usePlayerStore((s) => s.toggleTheater);
  return (
    <IconButton
      label={theater ? 'Exit theater mode' : 'Theater mode'}
      aria-pressed={theater}
      active={theater}
      onClick={toggle}
      className="hidden sm:inline-flex"
    >
      <RectangleHorizontal size={22} aria-hidden />
    </IconButton>
  );
}
