'use client';

import { Check } from 'lucide-react';
import { COLOR_PRESETS, HEX_COLOR, isLightColor } from '@/lib/colors';
import { cn } from '@/lib/utils';

type ColorSwatchesProps = {
  value: string;
  onChange: (color: string) => void;
  /** Show a native colour input for custom colours. */
  allowCustom?: boolean;
  size?: 'sm' | 'md';
  label?: string;
};

export function ColorSwatches({ value, onChange, allowCustom = true, size = 'md', label = 'Color' }: ColorSwatchesProps) {
  const dimension = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const isPreset = COLOR_PRESETS.some((preset) => preset.value.toLowerCase() === value.toLowerCase());

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
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
            className={cn(
              dimension,
              'inline-flex items-center justify-center rounded-full ring-offset-background transition-transform hover:scale-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected && 'ring-2 ring-foreground ring-offset-2',
            )}
            style={{ backgroundColor: preset.value }}
          >
            {selected && <Check className={cn('h-3.5 w-3.5', isLightColor(preset.value) ? 'text-black' : 'text-white')} />}
          </button>
        );
      })}
      {allowCustom && (
        <label
          title="Custom colour"
          className={cn(
            dimension,
            'relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/40 text-[10px] font-semibold text-muted-foreground',
            !isPreset && 'border-solid ring-2 ring-foreground ring-offset-2 ring-offset-background',
          )}
          style={!isPreset && HEX_COLOR.test(value) ? { backgroundColor: value } : undefined}
        >
          {isPreset && '+'}
          <input
            type="color"
            value={HEX_COLOR.test(value) ? value : '#1E3A5F'}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pick a custom colour"
          />
        </label>
      )}
    </div>
  );
}
