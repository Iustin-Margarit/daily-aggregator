'use client';

import { forwardRef, useState } from 'react';
import { Ornament } from '@/components/site/ornament';
import { cn } from '@/lib/utils';

/*
 * The printed story actions, shared by the story cards and the story page:
 * an engraving in polished brass and a label in small capitals, like a line
 * of type at the foot of a column (colours: --action-icon, --action-ink).
 * Focus rings are drawn inside the button so a column never clips them.
 */
export const actionClass =
  'relative inline-flex h-10 items-center gap-2 rounded-[2px] px-2 font-label text-[0.78rem] font-semibold uppercase tracking-[0.13em] text-(--action-ink) decoration-(--ink-gold) decoration-1 underline-offset-[6px] transition-colors hover:text-(--brass-ink) hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-40 [--ornament-ink:var(--action-icon)]';

/** A hairline between two actions in a row. */
export function ActionDivider({ className }: { className?: string }) {
  return <span className={cn('h-4 w-px shrink-0 bg-rule/45', className)} aria-hidden="true" />;
}

/**
 * Clip story (save): brass scissors. Clipping snips them and runs a dotted
 * "cut here" line under the label, which is stamped "Clipped".
 */
export function ClipButton({
  saved,
  disabled,
  onToggle,
  className,
}: {
  saved: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const [cuts, setCuts] = useState(0);
  const cut = cuts > 0 && saved;
  return (
    <button
      type="button"
      onClick={() => {
        if (!saved) setCuts((n) => n + 1);
        onToggle();
      }}
      disabled={disabled}
      aria-pressed={saved}
      aria-label={saved ? 'Clipped: remove from saved stories' : 'Clip story: save it for later'}
      title={saved ? 'In your clippings (Saved). Press to remove.' : 'Clip this story to read later (Saved)'}
      className={cn(actionClass, saved && 'text-(--brass-ink)', className)}
    >
      <Ornament key={cuts} name="scissors" className={cn('h-[0.74rem]', cut && 'scissors-snip')} />
      {saved ? (
        <span key="clipped" className={cn('inline-block', cut && 'clip-stamp')}>
          Clipped
        </span>
      ) : (
        'Clip story'
      )}
      {cut && <span key={`cut-${cuts}`} className="cut-line" aria-hidden="true" />}
    </button>
  );
}

/** "More ☞": the label and a printer's fist pointing on to the menu. Used as a menu trigger. */
export const MoreButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function MoreButton(
  { className, children = 'More', ...props },
  ref,
) {
  return (
    <button ref={ref} type="button" aria-label="More options" className={cn(actionClass, 'group/read', className)} {...props}>
      {children}
      <Ornament name="fist" className="fist-poke w-[1.3rem]" />
    </button>
  );
});
