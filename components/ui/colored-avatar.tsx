import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-7 w-7 text-[0.9rem]',
  md: 'h-9 w-9 text-[1.1rem]',
  lg: 'h-14 w-14 text-[1.7rem]',
  xl: 'h-24 w-24 text-[2.9rem]',
};

type ColoredAvatarProps = {
  username?: string | null;
  color?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * The reader's monogram pressed into a blob of sealing wax in their chosen
 * colour. The wax's outline is a public-domain seal (public/ornaments/seal.webp);
 * the light, the pressed ring and the raised letter are shading on top.
 */
export function ColoredAvatar({ username, color, size = 'md', className }: ColoredAvatarProps) {
  const initial = username?.trim().charAt(0).toUpperCase() || '?';
  const wax = color || '#1E3A5F';
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 select-none drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.35)]', SIZES[size], className)}>
      <span
        className="flex h-full w-full items-center justify-center font-display font-bold italic leading-none"
        style={{
          backgroundColor: wax,
          backgroundImage: [
            // Light from the top left, shadow pooling at the bottom right.
            'radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.32), transparent 48%)',
            'radial-gradient(circle at 62% 70%, rgb(0 0 0 / 0.28), transparent 60%)',
            // The ring left by the seal's matrix.
            'radial-gradient(circle, transparent 55%, rgb(0 0 0 / 0.26) 57%, rgb(255 255 255 / 0.18) 61%, transparent 64%)',
          ].join(', '),
          color: `color-mix(in oklab, ${wax} 45%, #fff6e6)`,
          textShadow: '0 1px 0 rgb(0 0 0 / 0.45), 0 -0.5px 0 rgb(255 255 255 / 0.35)',
          mask: 'url(/ornaments/seal.webp) center / contain no-repeat',
        }}
      >
        {initial}
      </span>
    </span>
  );
}
