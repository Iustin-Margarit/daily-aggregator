'use client';

import Link, { useLinkStatus } from 'next/link';
import { Ornament } from '@/components/site/ornament';
import { pageHref, visiblePages } from '@/lib/feed';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

type PaginationProps = {
  page: number;
  pages: number;
  /** The list's own address and query (lib/feed.ts, pageHref). */
  path: string;
  query: Record<string, string>;
};

/** While the page a link leads to is on its way: the link's ink fades (the old page stays until the new one is in). */
function Turning() {
  const { pending } = useLinkStatus();
  return pending ? <span className="pagination-pending" aria-hidden="true" /> : null;
}

const linkClass = 'relative inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[3px] font-display text-[0.95rem] font-semibold transition-colors';

/**
 * Previous page, the page numbers and Next page, as plain links: each page is printed by the server
 * (components/feed/page-turn.tsx turns it in and brings the reader back to the top of the list).
 */
export function Pagination({ page, pages, path, query }: PaginationProps) {
  const hrefFor = (p: number) => pageHref(path, query, p);
  const { t, fmt } = useI18n();
  if (pages <= 1) return null;
  const { previous, prev, next, nextShort } = t.pagination;

  return (
    <nav aria-label={t.pagination.label} className="flex items-center justify-between gap-2 sm:gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} scroll={false} className={cn(linkClass, 'frame-ruled group/read gap-2 px-3 max-[319px]:gap-1.5 max-[319px]:px-2 sm:gap-2.5 sm:px-4')} rel="prev">
          {/* A printer's fist pointing back (☜). */}
          <span className="-scale-x-100">
            <Ornament name="fist" className="fist-poke block w-[1.1rem] sm:w-[1.35rem] [--ornament-ink:var(--action-icon)]" />
          </span>
          <span className="hidden lg:inline">{previous}</span>
          <span className="max-[319px]:sr-only lg:hidden">{prev}</span>
          <Turning />
        </Link>
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
              <Link
                href={hrefFor(p)}
                scroll={false}
                aria-current={p === page ? 'page' : undefined}
                aria-label={fmt(t.pagination.page, { n: p })}
                className={cn(
                  linkClass,
                  'min-w-10 px-2 tabular-nums',
                  p === page ? 'border-[3px] border-double border-(--ink-gold) bg-(--ink-gold)/12 text-foreground' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
                )}
              >
                {p}
                <Turning />
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < pages ? (
        <Link href={hrefFor(page + 1)} scroll={false} className={cn(linkClass, 'group/read gap-2 border border-primary bg-primary px-3 max-[319px]:gap-1.5 max-[319px]:px-2 text-primary-foreground shadow-[inset_0_0_0_2px_hsl(var(--primary)),inset_0_0_0_3px_hsl(var(--primary-foreground)/0.4)] hover:bg-primary/90 sm:gap-2.5 sm:px-5')} rel="next">
          <span className="hidden lg:inline">{next}</span>
          <span className="max-[319px]:sr-only lg:hidden">{nextShort}</span>
          {/* A printer's fist pointing on (☞). */}
          <Ornament name="fist" className="fist-poke w-[1.1rem] sm:w-[1.35rem] [--ornament-ink:currentColor]" />
          <Turning />
        </Link>
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
