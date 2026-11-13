'use client';

import { cn } from '@/lib/utils';

type SegmentedOption<T extends string> = { value: T; label: React.ReactNode; title?: string };

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  'aria-label'?: string;
};

/** Small toggle group (e.g. Latest / For you), styled like a printed index. */
export function Segmented<T extends string>({ value, onChange, options, className, ...rest }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={rest['aria-label']} className={cn('inline-flex h-9 items-stretch border border-rule', className)}>
      {options.map((option, index) => {
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
              'inline-flex items-center gap-1.5 px-3 font-label text-[0.7rem] font-medium uppercase tracking-[0.14em] transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              index > 0 && 'border-l border-rule',
              active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
