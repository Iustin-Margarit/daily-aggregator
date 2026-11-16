'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ornament } from '@/components/site/ornament';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { LATEST_PATH, SEARCH_PATH, sectionPath } from '@/lib/routes';
import type { Category } from '@/lib/types';

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
      <div className="flex items-stretch gap-3 sm:gap-5">
        {/* The ribbon scrolls sideways whenever the departments do not all fit (styles: .dept-bar). */}
        <DeptBar label={t.toolbar.sections}>
          <Link href={LATEST_PATH} className="dept-tab" aria-current={current?.kind === 'latest' ? 'page' : undefined}>
            {t.toolbar.latest}
          </Link>
          {categories.map((category) => {
            const style = getCategoryStyle(category.name);
            const here = current?.kind === 'section' && current.id === category.id;
            return (
              <Link key={category.id} href={sectionPath(category.name)} className="dept-tab" aria-current={here ? 'page' : undefined} data-section={style.key ?? undefined}>
                {sectionText(t, style.key, category.name).name}
              </Link>
            );
          })}
        </DeptBar>
        {/* An action, not a section: a boxed ticket with a magnifier, apart from the ribbon (styles: .search-ticket). */}
        <Link href={SEARCH_PATH} className="search-ticket" aria-current={current?.kind === 'search' ? 'page' : undefined}>
          <Ornament name="magnifier" className="h-[1.3rem] -rotate-[30deg]" />
          <span className="max-[359px]:sr-only">{t.toolbar.searchTab}</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * The department ribbon. When some departments are out of sight it fades on that side and a printer's fist
 * (☞) points the way, nudging twice when the page opens; pressing it turns the ribbon. The current department
 * is scrolled into view. Pointer and touch readers can still swipe; keyboard readers tab along the links.
 */
function DeptBar({ label, children }: { label: string; children: React.ReactNode }) {
  const bar = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

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

  const turn = (direction: 1 | -1) => bar.current?.scrollBy({ left: direction * bar.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div className="relative min-w-0 flex-1">
      <nav ref={bar} aria-label={label} className="dept-bar" data-more-left={more.left || undefined} data-more-right={more.right || undefined}>
        {children}
      </nav>
      {/* Pointers for the eye only: the links in the ribbon are reachable by Tab, and the ribbon by swiping. */}
      {more.left && (
        <button type="button" tabIndex={-1} aria-hidden="true" className="dept-more left-0" onClick={() => turn(-1)}>
          <span className="-scale-x-100">
            <Ornament name="fist" className="block w-[1.5rem] [--ornament-ink:var(--brass-ink)]" />
          </span>
        </button>
      )}
      {more.right && (
        <button type="button" tabIndex={-1} aria-hidden="true" className="dept-more dept-more-nudge right-0" onClick={() => turn(1)}>
          <Ornament name="fist" className="block w-[1.5rem] [--ornament-ink:var(--brass-ink)]" />
        </button>
      )}
    </div>
  );
}
