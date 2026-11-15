'use client';

import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

type PaginationProps = {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  /** Builds the URL of a page so links can be opened in a new tab. */
  hrefFor: (page: number) => string;
  disabled?: boolean;
};

/** Page numbers around the current one: 1 … 4 5 [6] 7 8 … 31 */
function visiblePages(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) out.push(p - sorted[index - 1] === 2 ? p - 1 : 'gap');
    out.push(p);
  });
  return out;
}

const linkClass = 'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[3px] font-display text-[0.95rem] font-semibold transition-colors';

export function Pagination({ page, pages, onChange, hrefFor, disabled }: PaginationProps) {
  const { t, fmt } = useI18n();
  if (pages <= 1) return null;
  const { previous, prev, next, nextShort } = t.pagination;

  const go = (target: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let ctrl/cmd-click open the page in a new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (!disabled && target !== page) onChange(target);
  };

  return (
    <nav aria-label={t.pagination.label} className={cn('flex items-center justify-between gap-2 sm:gap-3', disabled && 'opacity-60')}>
      {page > 1 ? (
        <a href={hrefFor(page - 1)} onClick={go(page - 1)} className={cn(linkClass, 'group/read gap-2 border border-rule/50 bg-card/70 px-3 max-[319px]:gap-1.5 max-[319px]:px-2 shadow-[inset_0_0_0_2px_hsl(var(--card)),inset_0_0_0_3px_hsl(var(--rule)/0.22)] hover:border-(--ink-gold) hover:bg-card sm:gap-2.5 sm:px-4')} rel="prev">
          {/* A printer's fist pointing back (☜). */}
          <span className="-scale-x-100">
            <Ornament name="fist" className="fist-poke block w-[1.1rem] sm:w-[1.35rem] [--ornament-ink:var(--action-icon)]" />
          </span>
          <span className="hidden lg:inline">{previous}</span>
          <span className="max-[319px]:sr-only lg:hidden">{prev}</span>
        </a>
      ) : (
        // Keeps the page numbers centred: as wide as the "Previous page" link would be.
        <span className={cn(linkClass, 'invisible gap-2 px-3 sm:gap-2.5 sm:px-4')} aria-hidden="true">
          <span className="w-[1.1rem] sm:w-[1.35rem]" />
          <span className="hidden lg:inline">{previous}</span>
          <span className="max-[319px]:sr-only lg:hidden">{prev}</span>
        </span>
      )}

      {/* Below 768px only the page you are on sits between Previous and Next (the whole row does not fit),
          and the buttons keep their short names until 1024px. */}
      <ol className="flex items-center gap-0.5 sm:gap-1">
        {visiblePages(page, pages).map((p, index) =>
          p === 'gap' ? (
            <li key={`gap-${index}`} className="w-6 text-center text-muted-foreground max-md:hidden" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p} className={cn(p !== page && 'max-md:hidden')}>
              <a
                href={hrefFor(p)}
                onClick={go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={fmt(t.pagination.page, { n: p })}
                className={cn(
                  linkClass,
                  'min-w-10 px-2 tabular-nums',
                  p === page ? 'border-[3px] border-double border-(--ink-gold) bg-(--ink-gold)/12 text-foreground' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
                )}
              >
                {p}
              </a>
            </li>
          ),
        )}
      </ol>

      {page < pages ? (
        <a href={hrefFor(page + 1)} onClick={go(page + 1)} className={cn(linkClass, 'group/read gap-2 border border-primary bg-primary px-3 max-[319px]:gap-1.5 max-[319px]:px-2 text-primary-foreground shadow-[inset_0_0_0_2px_hsl(var(--primary)),inset_0_0_0_3px_hsl(var(--primary-foreground)/0.4)] hover:bg-primary/90 sm:gap-2.5 sm:px-5')} rel="next">
          <span className="hidden lg:inline">{next}</span>
          <span className="max-[319px]:sr-only lg:hidden">{nextShort}</span>
          {/* A printer's fist pointing on (☞). */}
          <Ornament name="fist" className="fist-poke w-[1.1rem] sm:w-[1.35rem] [--ornament-ink:currentColor]" />
        </a>
      ) : (
        <span className={cn(linkClass, 'invisible gap-2 px-3 sm:gap-2.5 sm:px-5')} aria-hidden="true">
          <span className="hidden lg:inline">{next}</span>
          <span className="max-[319px]:sr-only lg:hidden">{nextShort}</span>
          <span className="w-[1.1rem] sm:w-[1.35rem]" />
        </span>
      )}
    </nav>
  );
}
