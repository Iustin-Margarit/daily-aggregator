'use client';

import { COLOR_PRESETS, HEX_COLOR } from '@/lib/colors';
import { cn } from '@/lib/utils';

type ColorSwatchesProps = {
  value: string;
  onChange: (color: string) => void;
  /** Show a native colour input for custom colours. */
  allowCustom?: boolean;
  size?: 'sm' | 'md';
  label?: string;
};

/** A blob of sealing wax in one ink (the public-domain seal outline, lit from the top left). */
function Wax({ color, pressed }: { color: string; pressed: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center font-display text-[0.8em] leading-none"
      style={{
        backgroundColor: color,
        backgroundImage: [
          'radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.34), transparent 48%)',
          'radial-gradient(circle at 64% 72%, rgb(0 0 0 / 0.3), transparent 62%)',
          // The ring of the seal's matrix, pressed in when this ink is chosen.
          pressed ? 'radial-gradient(circle, transparent 50%, rgb(0 0 0 / 0.3) 53%, rgb(255 255 255 / 0.2) 58%, transparent 61%)' : '',
        ]
          .filter(Boolean)
          .join(', '),
        color: `color-mix(in oklab, ${color} 40%, #fff6e6)`,
        textShadow: '0 1px 0 rgb(0 0 0 / 0.45)',
        mask: 'url(/ornaments/seal.webp) center / contain no-repeat',
      }}
    >
      {pressed && '✦'}
    </span>
  );
}

/**
 * Printing inks as blobs of sealing wax. The chosen one is pressed with the
 * seal (a ring and a star) and sits a little raised; a plain parchment blob
 * with a + mixes a custom ink.
 */
export function ColorSwatches({ value, onChange, allowCustom = true, size = 'md', label = 'Color' }: ColorSwatchesProps) {
  const dimension = size === 'sm' ? 'h-7 w-7 text-[0.9rem]' : 'h-10 w-10 text-[1.15rem]';
  const isPreset = COLOR_PRESETS.some((preset) => preset.value.toLowerCase() === value.toLowerCase());
  const seal = cn(
    dimension,
    'relative inline-flex shrink-0 rounded-full drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.35)] transition-transform focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  );

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2.5">
      {COLOR_PRESETS.map((preset) => {
        const selected = preset.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={preset.name}
            title={preset.name}
            onClick={() => onChange(preset.value)}
            className={cn(seal, selected ? '-translate-y-0.5 scale-110 drop-shadow-[0_3px_3px_rgb(0_0_0/0.4)]' : 'hover:-translate-y-0.5')}
          >
            <Wax color={preset.value} pressed={selected} />
          </button>
        );
      })}
      {allowCustom && (
        <label title="Mix your own ink" className={cn(seal, 'cursor-pointer', !isPreset && '-translate-y-0.5 scale-110')}>
          {!isPreset && HEX_COLOR.test(value) ? (
            <Wax color={value} pressed />
          ) : (
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center font-display font-semibold text-muted-foreground"
              style={{
                backgroundColor: 'hsl(var(--muted))',
                backgroundImage: 'radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.3), transparent 50%)',
                mask: 'url(/ornaments/seal.webp) center / contain no-repeat',
              }}
            >
              +
            </span>
          )}
          <input
            type="color"
            value={HEX_COLOR.test(value) ? value : '#1E3A5F'}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Mix a custom ink"
          />
        </label>
      )}
    </div>
  );
}
