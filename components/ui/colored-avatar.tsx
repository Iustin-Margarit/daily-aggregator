import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-7 w-7 text-sm',
  md: 'h-9 w-9 text-base',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-24 w-24 text-5xl',
};

type ColoredAvatarProps = {
  username?: string | null;
  color?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Initial-letter seal printed in the user's chosen ink. */
export function ColoredAvatar({ username, color, size = 'md', className }: ColoredAvatarProps) {
  const initial = username?.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold leading-none text-[#f7f3ea] ring-1 ring-rule ring-offset-2 ring-offset-background',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color || '#1E3A5F' }}
    >
      {initial}
    </span>
  );
}
