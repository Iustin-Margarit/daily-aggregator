'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
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

const linkClass = 'label inline-flex h-9 items-center justify-center transition-colors';

export function Pagination({ page, pages, onChange, hrefFor, disabled }: PaginationProps) {
  if (pages <= 1) return null;

  const go = (target: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let ctrl/cmd-click open the page in a new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (!disabled && target !== page) onChange(target);
  };

  return (
    <nav aria-label="Pages" className={cn('flex items-center justify-between gap-3 border-y-2 border-rule py-2', disabled && 'opacity-60')}>
      {page > 1 ? (
        <a href={hrefFor(page - 1)} onClick={go(page - 1)} className={cn(linkClass, 'gap-1.5 px-1 hover:underline')} rel="prev">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Previous page</span>
          <span className="sm:hidden">Prev</span>
        </a>
      ) : (
        <span className={cn(linkClass, 'invisible px-1')} aria-hidden="true">
          Previous page
        </span>
      )}

      <ol className="flex items-center gap-0.5 sm:gap-1">
        {visiblePages(page, pages).map((p, index) =>
          p === 'gap' ? (
            <li key={`gap-${index}`} className="label w-6 text-center text-muted-foreground" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p} className={cn(Math.abs(p - page) > 1 && p !== 1 && p !== pages && 'hidden sm:block')}>
              <a
                href={hrefFor(p)}
                onClick={go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={cn(
                  linkClass,
                  'min-w-9 px-2 font-display text-base font-bold normal-case tracking-normal',
                  p === page ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:underline',
                )}
              >
                {p}
              </a>
            </li>
          ),
        )}
      </ol>

      {page < pages ? (
        <a href={hrefFor(page + 1)} onClick={go(page + 1)} className={cn(linkClass, 'gap-1.5 px-1 hover:underline')} rel="next">
          <span className="hidden sm:inline">Next page</span>
          <span className="sm:hidden">Next</span> <ArrowRight className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span className={cn(linkClass, 'invisible px-1')} aria-hidden="true">
          Next page
        </span>
      )}
    </nav>
  );
}
