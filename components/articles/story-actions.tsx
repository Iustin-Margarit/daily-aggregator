'use client';

import { forwardRef, useState } from 'react';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
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
 * Save: the engraved quill of the Saved tab, so the button and the page it
 * fills look alike. Saving stamps the label "Saved".
 */
export function SaveButton({
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
  const [stamps, setStamps] = useState(0);
  const stamp = stamps > 0 && saved;
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => {
        if (!saved) setStamps((n) => n + 1);
        onToggle();
      }}
      disabled={disabled}
      aria-pressed={saved}
      aria-label={saved ? t.story.savedLabel : t.story.saveLabel}
      title={saved ? t.story.savedTitle : t.story.saveTitle}
      className={cn(actionClass, saved && 'text-(--brass-ink)', className)}
    >
      {/* A hairline shadow thickens the quill's fine lines, as on the Saved tab. */}
      <span className="inline-flex drop-shadow-[0_0_0.4px_var(--action-icon)]" aria-hidden="true">
        <Engraving name="quill" className="-my-1 h-[1.4rem] [--engraving-ink:var(--action-icon)]" />
      </span>
      {saved ? (
        <span key="saved" className={cn('inline-block', stamp && 'clip-stamp')}>
          {t.story.saved}
        </span>
      ) : (
        t.story.save
      )}
    </button>
  );
}

/** "More ☞": the label and a printer's fist pointing on to the menu. Used as a menu trigger. */
export const MoreButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function MoreButton(
  { className, children, ...props },
  ref,
) {
  const { t } = useI18n();
  return (
    <button ref={ref} type="button" aria-label={t.story.moreOptions} className={cn(actionClass, 'group/read', className)} {...props}>
      {children ?? t.story.more}
      <Ornament name="fist" className="fist-poke w-[1.3rem]" />
    </button>
  );
});
