'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import { safeExternalUrl } from '@/lib/redirect';
import { cn } from '@/lib/utils';

/*
 * The printed story actions, shared by the story cards and the quick-read sheet:
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
      data-save-button=""
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

/**
 * "More ▾": the label and the small brass caret the account menu also uses, so it reads as
 * "opens a menu" (the printer's fist is kept for "Read dispatch"). Used as a menu trigger.
 */
export const MoreButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function MoreButton(
  { className, children, ...props },
  ref,
) {
  const { t } = useI18n();
  return (
    <button ref={ref} type="button" aria-label={t.story.moreOptions} className={cn(actionClass, 'group/more', className)} {...props}>
      {children ?? t.story.more}
      <span
        className="text-[0.75rem] text-(--ink-gold) transition-transform group-data-[state=open]/more:rotate-180"
        aria-hidden="true"
      >
        ▾
      </span>
    </button>
  );
});

/**
 * Share: the carrier pigeon with its letter (Yarrell, 1843). Phones open their
 * own share sheet; elsewhere the link is copied and the label reads "Copied"
 * for a moment (both labels share one cell, so the row does not jump).
 */
export function ShareButton({
  onShare,
  className,
}: {
  onShare: () => Promise<'shared' | 'copied' | 'cancelled' | 'failed'>;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  const { t } = useI18n();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      onClick={async () => {
        if ((await onShare()) !== 'copied') return;
        window.clearTimeout(timer.current);
        setCopied(true);
        timer.current = window.setTimeout(() => setCopied(false), 2200);
      }}
      title={t.article.shareTitle}
      className={cn(actionClass, copied && 'text-(--brass-ink)', className)}
    >
      <Ornament name="pigeon" className="h-[1.05rem]" />
      <span className="grid">
        <span className={cn('[grid-area:1/1]', copied && 'invisible')}>{t.story.share}</span>
        <span className={cn('clip-stamp [grid-area:1/1]', !copied && 'invisible')} aria-hidden={!copied}>
          {t.story.copied}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? t.story.linkCopied : ''}
      </span>
    </button>
  );
}

/**
 * "Read on Engadget": the story on its publisher's own site, in a new tab.
 * Framed like the Filters ticket (styles: .source-ticket) so it reads as a way
 * out of the paper, with a pair of spectacles (Pearson Scott Foresman) on the
 * left and a printed arrow on the right. Only plain http(s) links are printed;
 * a long source name is cut short with an ellipsis (the words around it, which
 * differ by edition, never are), and the full name is in the tooltip.
 */
export function ReadOnLink({
  url,
  source,
  className,
}: {
  url: string;
  source: string;
  className?: string;
}) {
  const { t, fmt } = useI18n();
  const href = safeExternalUrl(url);
  if (!href) return null;
  const [before = '', after = ''] = t.story.readOn.split('{source}');
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={fmt(t.story.readOnTitle, { source })}
      className={cn('source-ticket', className)}
    >
      <Ornament name="spectacles" className="w-[1.6rem] shrink-0" />
      <span className="flex min-w-0">
        {before && <span className="shrink-0 whitespace-pre">{before}</span>}
        <span className="truncate">{source}</span>
        {after && <span className="shrink-0 whitespace-pre">{after}</span>}
      </span>
      {/* U+FE0E keeps phones from drawing the arrow as an emoji. */}
      <span className="source-ticket-arrow" aria-hidden="true">
        {'\u2197\uFE0E'}
      </span>
    </a>
  );
}
