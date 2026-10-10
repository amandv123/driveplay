import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'> {
  /** Used for both the accessible name and the native tooltip. */
  label: string;
  active?: boolean;
  children: ReactNode;
}

/** 44px touch target on mobile, 40px on desktop. */
export function IconButton({
  label,
  active = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:bg-white/20 motion-reduce:transition-none sm:h-10 sm:min-w-10 ${
        active ? 'bg-white/15 text-white' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
