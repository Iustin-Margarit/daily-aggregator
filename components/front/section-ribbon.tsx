'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ornament } from '@/components/site/ornament';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { stayOnCurrentPage } from '@/lib/current-page';
import { LATEST_PATH, SEARCH_PATH, sectionPath } from '@/lib/routes';
import type { Category } from '@/lib/types';
import { useScrollPeek } from '@/lib/use-scroll-peek';

/** Which tab of the ribbon is the page the reader is on (a section's id, the latest or a search), if any. */
export type RibbonPlace = { kind: 'latest' } | { kind: 'section'; id: string } | { kind: 'search' } | null;

/**
 * The paper's departments as one band between double rules: All the latest, then
 * every section, each a link to its own page, and set apart at the right end a
 * boxed "Search" ticket. The same ribbon on the front page and on every list.
 */
export function SectionRibbon({ categories, current = null, className }: { categories: Pick<Category, 'id' | 'name'>[]; current?: RibbonPlace; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={className}>
      {/* Below 1024px the Search ticket stands at the left, apart from the scrolling ribbon's faded right end. */}
      <div className="flex items-stretch gap-3 sm:gap-5">
        {/* The ribbon scrolls sideways whenever the departments do not all fit (styles: .dept-bar). */}
        <DeptBar label={t.toolbar.sections}>
          <Link href={LATEST_PATH} className="dept-tab" aria-current={current?.kind === 'latest' ? 'page' : undefined} onClick={(event) => stayOnCurrentPage(event, LATEST_PATH)}>
            {t.toolbar.latest}
          </Link>
          {categories.map((category) => {
            const style = getCategoryStyle(category.name);
            const here = current?.kind === 'section' && current.id === category.id;
            return (
              <Link
                key={category.id}
                href={sectionPath(category.name)}
                className="dept-tab"
                aria-current={here ? 'page' : undefined}
                data-section={style.key ?? undefined}
                onClick={(event) => stayOnCurrentPage(event, sectionPath(category.name))}
              >
                {sectionText(t, style.key, category.name).name}
              </Link>
            );
          })}
        </DeptBar>
        {/* An action, not a section: a boxed ticket with a magnifier, apart from the ribbon (styles: .search-ticket).
            Not on the search page itself, where the search form is the way to search. */}
        {current?.kind !== 'search' && (
          <Link href={SEARCH_PATH} className="search-ticket max-lg:order-first">
            <Ornament name="magnifier" className="h-[1.3rem] -rotate-[30deg]" />
            <span className="max-[359px]:sr-only">{t.toolbar.searchTab}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * The department ribbon. When some departments are out of sight it fades on that side; on a phone it also glides
 * a little way along and back when it first comes into view (lib/use-scroll-peek.ts), so readers see it scrolls.
 * The current department is scrolled into view. Pointer and touch readers swipe; keyboard readers tab along.
 */
function DeptBar({ label, children }: { label: string; children: React.ReactNode }) {
  const bar = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  useScrollPeek(bar, 'sections');

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const measure = () =>
      setMore((prev) => {
        const left = el.scrollLeft > 2;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        return prev.left === left && prev.right === right ? prev : { left, right };
      });
    const chosen = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (chosen && (chosen.offsetLeft + chosen.offsetWidth > el.clientWidth || chosen.offsetLeft < el.scrollLeft)) {
      el.scrollLeft = chosen.offsetLeft - el.clientWidth / 2 + chosen.offsetWidth / 2;
    }
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-w-0 flex-1">
      <nav ref={bar} aria-label={label} className="dept-bar" data-more-left={more.left || undefined} data-more-right={more.right || undefined}>
        {children}
      </nav>
    </div>
  );
}
