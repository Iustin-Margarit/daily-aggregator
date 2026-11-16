'use client';

import { useEffect, useRef, useState } from 'react';
import { SourceList } from '@/components/feed/source-picker';
import { Ornament } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { LedgerSearch } from '@/components/ui/ledger-search';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import type { Category, DateRange, FeedFilters, SourceOption } from '@/lib/types';

type FeedToolbarProps = {
  filters: FeedFilters;
  onChange: (patch: Partial<FeedFilters>) => void;
  categories: Category[];
  sources: SourceOption[];
  preferredCategoryIds: string[];
};

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/**
 * The few controls of the front page: the department ribbon (one full-width
 * band of sections between double rules) and, set apart at its right, a boxed
 * "Filters" button for the rarer choices (how recent, which newspapers).
 */
export function FeedToolbar({ filters, onChange, categories, sources, preferredCategoryIds }: FeedToolbarProps) {
  /** Shows one set of sections; newspaper choices outside them are dropped. */
  const showSections = (categoryIds: string[]) => {
    const sourceIds = filters.sourceIds.filter((sourceId) => {
      const categoryId = sources.find((s) => s.id === sourceId)?.category_id;
      return categoryIds.length === 0 || (categoryId !== undefined && categoryIds.includes(categoryId));
    });
    onChange({ categoryIds, sourceIds });
  };

  const showingMine = preferredCategoryIds.length > 0 && sameIds(filters.categoryIds, preferredCategoryIds);
  const { t } = useI18n();

  return (
    <div className="flex items-stretch gap-3 sm:gap-5">
      {/* The ribbon scrolls sideways whenever the departments do not all fit (styles: .dept-bar). */}
      <DeptBar label={t.toolbar.sections}>
        {preferredCategoryIds.length > 0 && (
          <button type="button" className="dept-tab" aria-pressed={showingMine} onClick={() => showSections(preferredCategoryIds)}>
            {t.toolbar.mine}
          </button>
        )}
        <button type="button" className="dept-tab" aria-pressed={filters.categoryIds.length === 0} onClick={() => showSections([])}>
          {t.toolbar.everything}
        </button>
        {categories.map((category) => {
          const active = !showingMine && filters.categoryIds.length === 1 && filters.categoryIds[0] === category.id;
          const style = getCategoryStyle(category.name);
          return (
            <button
              key={category.id}
              type="button"
              className="dept-tab"
              aria-pressed={active}
              data-section={style.key ?? undefined}
              onClick={() => showSections([category.id])}
            >
              {sectionText(t, style.key, category.name).name}
            </button>
          );
        })}
      </DeptBar>
      {/* Phones show Filters beside Latest | For you instead (components/feed/feed-view.tsx), so the ribbon gets the full width. */}
      <div className="hidden items-stretch sm:flex">
        <FilterButton filters={filters} onChange={onChange} categories={categories} sources={sources} />
      </div>
    </div>
  );
}

/**
 * The department ribbon. When some departments are out of sight it fades on that side and a printer's fist
 * (☞) points the way, nudging twice when the page opens; pressing it turns the ribbon. The chosen department
 * is scrolled into view. Pointer and touch readers can still swipe; keyboard readers tab along the buttons.
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
    const chosen = el.querySelector<HTMLElement>('[aria-pressed="true"]');
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
      {/* Pointers for the eye only: the buttons in the ribbon are reachable by Tab, and the ribbon by swiping. */}
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

/** The search box for headlines; waits for a pause in typing before searching. */
export function FeedSearch({ value, onChange, className }: { value: string; onChange: (search: string) => void; className?: string }) {
  const [search, setSearch] = useState(value);
  const debounce = useRef<number | null>(null);
  const { t } = useI18n();

  // A new value from the page (cleared, or the Front Page tab) replaces what was typed.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setSearch(value);
  }
  useEffect(
    () => () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    },
    [],
  );

  const updateSearch = (next: string) => {
    setSearch(next);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => onChange(next.trim()), 350);
  };

  return (
    <LedgerSearch
      value={search}
      onChange={updateSearch}
      onClear={() => {
        if (debounce.current) window.clearTimeout(debounce.current);
        setSearch('');
        onChange('');
      }}
      onSubmit={() => {
        if (debounce.current) window.clearTimeout(debounce.current);
        onChange(search.trim());
      }}
      placeholder={t.toolbar.search}
      label={t.toolbar.searchLabel}
      clearLabel={t.toolbar.clearSearch}
      className={className}
    />
  );
}

const RANGES: DateRange[] = ['today', 'week', 'any'];

/** The boxed Filters ticket and its dialog (how recent, which newspapers). */
export function FilterButton({ filters, onChange, categories, sources }: Omit<FeedToolbarProps, 'preferredCategoryIds'>) {
  const active = (filters.range !== 'any' ? 1 : 0) + (filters.sourceIds.length > 0 ? 1 : 0);
  const { t } = useI18n();
  return (
    <Dialog>
      {/* An action, not a section: a boxed ticket with a funnel, apart from the ribbon (styles: .filter-ticket). */}
      <DialogTrigger asChild>
        <button type="button" className="filter-ticket">
          <Ornament name="funnel" className="h-[1.3rem]" />
          {t.toolbar.filters}
          {active > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] bg-primary px-1.5 text-[0.72rem] tracking-normal text-primary-foreground">
              <span className="sr-only">(</span>
              {active}
              <span className="sr-only">{t.toolbar.inUse}</span>
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.toolbar.filters}</DialogTitle>
          <DialogDescription>{t.toolbar.filtersNote}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="font-label text-[0.95rem] font-medium">{t.toolbar.howRecent}</p>
          <Segmented<DateRange>
            aria-label={t.toolbar.howRecent}
            value={filters.range}
            onChange={(range) => onChange({ range })}
            options={RANGES.map((value) => ({ value, label: t.toolbar.ranges[value] }))}
          />
        </div>

        <div className="space-y-2">
          <p className="font-label text-[0.95rem] font-medium">
            {t.toolbar.newspapers} <span className="font-normal text-muted-foreground">{t.toolbar.noneTicked}</span>
          </p>
          <SourceList
            sources={sources}
            categories={categories}
            visibleCategoryIds={filters.categoryIds}
            selected={filters.sourceIds}
            onChange={(sourceIds) => onChange({ sourceIds })}
          />
        </div>

        <DialogFooter className="pt-1">
          <Button variant="ghost" onClick={() => onChange({ range: 'any', sourceIds: [] })} disabled={active === 0}>
            {t.toolbar.reset}
          </Button>
          <DialogClose asChild>
            <Button>{t.common.done}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
