'use client';

import type { FormEvent } from 'react';
import { Ornament } from '@/components/site/ornament';
import { cn } from '@/lib/utils';

type LedgerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  label: string;
  clearLabel: string;
  /** Given: the field is a search form (Enter submits). Otherwise a plain box that filters as you type. */
  onSubmit?: () => void;
  className?: string;
};

/**
 * The search box written on a ledger line (front page and Saved): a brass
 * magnifier on the left, a double rule underneath, and a × to clear it.
 */
export function LedgerSearch({ value, onChange, onClear, placeholder, label, clearLabel, onSubmit, className }: LedgerSearchProps) {
  const inner = (
    <>
      <span className="search-glass pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rotate-[-30deg]" aria-hidden="true">
        <Ornament name="magnifier" className="block h-[1.45rem]" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="ledger-field"
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[2px] p-1 text-muted-foreground hover:bg-foreground/7 hover:text-foreground"
          aria-label={clearLabel}
        >
          <span aria-hidden="true" className="block px-0.5 font-display text-[1.25rem] leading-none">×</span>
        </button>
      )}
    </>
  );

  if (!onSubmit) return <div className={cn('relative min-w-0', className)}>{inner}</div>;
  return (
    <form
      role="search"
      className={cn('relative min-w-0', className)}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {inner}
    </form>
  );
}
