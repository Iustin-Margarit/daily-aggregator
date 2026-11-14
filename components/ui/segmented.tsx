'use client';

import { cn } from '@/lib/utils';

type SegmentedOption<T extends string> = { value: T; label: React.ReactNode; title?: string };

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** "boxed" (forms and dialogs) or "ribbon": small capitals between hairline rules, like the front page's departments. */
  variant?: 'boxed' | 'ribbon';
  className?: string;
  'aria-label'?: string;
};

/** A row of ledger tabs, one of which is chosen (e.g. Today / This week). */
export function Segmented<T extends string>({ value, onChange, options, variant = 'boxed', className, ...rest }: SegmentedProps<T>) {
  const ribbon = variant === 'ribbon';
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn(
        ribbon
          ? 'inline-flex items-stretch border-y border-rule/45'
          : // Wraps onto a second row only when a long label truly does not fit (a phone, a longer language).
            'inline-flex min-h-10 max-w-full flex-wrap items-stretch gap-1 rounded-[3px] border-[3px] border-double border-rule/35 bg-card/70 p-0.5',
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
              ribbon
                ? 'dept-tab min-h-10'
                : 'inline-flex min-h-[1.875rem] items-center gap-1.5 whitespace-nowrap rounded-[2px] px-3.5 font-label text-[0.82rem] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
              !ribbon &&
                (active ? 'bg-(--ink-gold)/18 text-foreground shadow-[inset_0_-2px_0_var(--ink-gold)]' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground'),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
