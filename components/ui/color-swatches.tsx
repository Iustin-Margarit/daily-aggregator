'use client';

import { COLOR_PRESETS, HEX_COLOR } from '@/lib/colors';
import { useI18n } from '@/lib/i18n/client';
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
export function ColorSwatches({ value, onChange, allowCustom = true, size = 'md', label }: ColorSwatchesProps) {
  const { t } = useI18n();
  const inks = t.settings.inks;
  const dimension = size === 'sm' ? 'h-7 w-7 text-[0.9rem]' : 'h-10 w-10 text-[1.15rem]';
  const isPreset = COLOR_PRESETS.some((preset) => preset.value.toLowerCase() === value.toLowerCase());
  const seal = cn(
    dimension,
    'relative inline-flex shrink-0 rounded-full drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.35)] transition-transform focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  );

  return (
    // Phones: the twelve inks in two even rows of six, and mixing your own on a line of its own, named.
    // From 640px: one wrapping row of seals.
    <div
      role="radiogroup"
      aria-label={label ?? inks.color}
      className="grid grid-cols-6 justify-items-center gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5"
    >
      {COLOR_PRESETS.map((preset, index) => {
        const name = inks.names[index] ?? preset.name;
        const selected = preset.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onChange(preset.value)}
            className={cn(seal, selected ? '-translate-y-0.5 scale-110 drop-shadow-[0_3px_3px_rgb(0_0_0/0.4)]' : 'hover:-translate-y-0.5')}
          >
            <Wax color={preset.value} pressed={selected} />
          </button>
        );
      })}
      {allowCustom && (
        <label
          title={inks.mix}
          className="relative col-span-6 inline-flex cursor-pointer items-center gap-3 justify-self-start rounded-[2px] pr-2 has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring sm:col-span-1 sm:pr-0"
        >
          <span className={cn(seal, !isPreset && '-translate-y-0.5 scale-110')}>
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
          </span>
          <span className="text-[0.92rem] italic text-muted-foreground sm:hidden">{inks.mix}</span>
          <input
            type="color"
            value={HEX_COLOR.test(value) ? value : '#1E3A5F'}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={inks.mixLabel}
          />
        </label>
      )}
    </div>
  );
}
