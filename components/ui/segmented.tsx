'use client';

import { cn } from '@/lib/utils';

type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  title?: string;
  /** A small picture of what the choice does (a type specimen, a clock face, a column of lines), printed above the label. */
  preview?: React.ReactNode;
};

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /**
   * On phones, fill the width instead of wrapping into uneven rows. Two choices
   * share it half and half; three or more become full-width ledger rows, each with its own
   * radio mark. From 640px it is the usual row of tabs.
   */
  fill?: boolean;
  className?: string;
  'aria-label'?: string;
};

/** A row of ledger tabs, one of which is chosen (e.g. Today / This week). */
export function Segmented<T extends string>({ value, onChange, options, fill = false, className, ...rest }: SegmentedProps<T>) {
  const halves = fill && options.length <= 2;
  const rows = fill && !halves;
  // With previews every choice is a little card: the picture above its label (on a phone's ledger rows: beside it).
  const cards = options.some((option) => option.preview);
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn(
        // Wraps onto a second row only when a long label truly does not fit (a phone, a longer language).
        'inline-flex min-h-10 max-w-full flex-wrap items-stretch gap-1 rounded-[3px] border-[3px] border-double border-rule/35 bg-card/70 p-0.5',
        halves && 'max-sm:grid max-sm:w-full max-sm:grid-cols-2',
        rows && 'max-sm:grid max-sm:w-full max-sm:grid-cols-1 max-sm:gap-0 max-sm:p-0',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-[1.875rem] items-center gap-1.5 whitespace-nowrap rounded-[2px] px-3.5 font-label text-[0.82rem] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
              active ? 'bg-(--ink-gold)/18 text-foreground shadow-[inset_0_-2px_0_var(--ink-gold)]' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
              // Halves: centred, and a long label may take two lines (both halves stay the same height).
              halves && 'max-sm:min-h-11 max-sm:justify-center max-sm:whitespace-normal max-sm:px-2 max-sm:py-1.5 max-sm:text-center max-sm:leading-tight',
              // Rows: the full width, a hairline between them, the chosen one marked in brass at its edge.
              rows &&
                'max-sm:min-h-11 max-sm:justify-start max-sm:gap-3 max-sm:whitespace-normal max-sm:rounded-none max-sm:border-b max-sm:border-rule/25 max-sm:px-3.5 max-sm:py-2 max-sm:text-left max-sm:last:border-b-0',
              rows && active && 'max-sm:shadow-[inset_4px_0_0_var(--ink-gold)]',
              cards && 'flex-col justify-end gap-1 px-4 py-2 sm:min-w-[5.5rem]',
              // Phones: a long single word ("Flattersatz") shares the width with its picture, so the label is set a
              // little tighter and may be hyphenated rather than run past the edge.
              cards && 'max-sm:min-w-0 max-sm:text-[0.76rem] max-sm:tracking-[0.04em] max-sm:hyphens-auto max-sm:break-words',
              cards && halves && 'max-sm:gap-1',
              cards && rows && 'max-sm:flex-row max-sm:items-center',
            )}
          >
            {rows && (
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2 sm:hidden',
                  active ? 'border-(--ink-gold)' : 'border-rule/50',
                )}
              >
                {active && <span className="size-2 rounded-full bg-(--ink-gold)" />}
              </span>
            )}
            {option.preview && (
              <span aria-hidden="true" className={cn('flex items-end justify-center normal-case tracking-normal', rows && 'max-sm:w-[4.5rem] max-sm:shrink-0')}>
                {option.preview}
              </span>
            )}
            {cards ? <span className="min-w-0 max-w-full">{option.label}</span> : option.label}
          </button>
        );
      })}
    </div>
  );
}
