'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SourceList } from '@/components/feed/source-picker';
import { Ornament } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import { getCategoryStyle } from '@/lib/category-styles';
import type { Category, DateRange, FeedFilters, SourceOption } from '@/lib/types';
import { cn } from '@/lib/utils';

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

  return (
    <div className="flex items-stretch gap-3 sm:gap-5">
      {/* Phones and tablets scroll the ribbon sideways; from 1280px every department shows (styles: .dept-bar). */}
      <nav aria-label="Sections" className="dept-bar min-w-0 flex-1">
        {preferredCategoryIds.length > 0 && (
          <button type="button" className="dept-tab" aria-pressed={showingMine} onClick={() => showSections(preferredCategoryIds)}>
            My sections
          </button>
        )}
        <button type="button" className="dept-tab" aria-pressed={filters.categoryIds.length === 0} onClick={() => showSections([])}>
          Everything
        </button>
        {categories.map((category) => {
          const active = !showingMine && filters.categoryIds.length === 1 && filters.categoryIds[0] === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className="dept-tab"
              aria-pressed={active}
              data-section={getCategoryStyle(category.name).key ?? undefined}
              onClick={() => showSections([category.id])}
            >
              {category.name}
            </button>
          );
        })}
      </nav>
      <FilterDialog filters={filters} onChange={onChange} categories={categories} sources={sources} />
    </div>
  );
}

/** The search box for headlines; waits for a pause in typing before searching. */
export function FeedSearch({ value, onChange, className }: { value: string; onChange: (search: string) => void; className?: string }) {
  const [search, setSearch] = useState(value);
  const debounce = useRef<number | null>(null);

  useEffect(() => setSearch(value), [value]);
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
    <form
      role="search"
      className={cn('relative min-w-0', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (debounce.current) window.clearTimeout(debounce.current);
        onChange(search.trim());
      }}
    >
      <span className="search-glass pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rotate-[-30deg]" aria-hidden="true">
        <Ornament name="magnifier" className="block h-[1.45rem]" />
      </span>
      <input
        type="search"
        value={search}
        onChange={(event) => updateSearch(event.target.value)}
        placeholder="Search headlines…"
        className="ledger-field"
        aria-label="Search headlines"
      />
      {search && (
        <button
          type="button"
          onClick={() => {
            setSearch('');
            onChange('');
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[2px] p-1 text-muted-foreground hover:bg-foreground/7 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'any', label: 'This month' },
];

function FilterDialog({ filters, onChange, categories, sources }: Omit<FeedToolbarProps, 'preferredCategoryIds'>) {
  const active = (filters.range !== 'any' ? 1 : 0) + (filters.sourceIds.length > 0 ? 1 : 0);
  return (
    <Dialog>
      {/* An action, not a section: a boxed ticket with a funnel, apart from the ribbon (styles: .filter-ticket). */}
      <DialogTrigger asChild>
        <button type="button" className="filter-ticket">
          <Ornament name="funnel" className="h-[1.3rem]" />
          Filters
          {active > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] bg-primary px-1.5 text-[0.72rem] tracking-normal text-primary-foreground">
              <span className="sr-only">(</span>
              {active}
              <span className="sr-only"> in use)</span>
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription>Changes show on the page straight away.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="font-label text-[0.95rem] font-medium">How recent</p>
          <Segmented<DateRange> aria-label="How recent" value={filters.range} onChange={(range) => onChange({ range })} options={RANGES} />
        </div>

        <div className="space-y-2">
          <p className="font-label text-[0.95rem] font-medium">
            Newspapers <span className="font-normal text-muted-foreground">(none ticked = all)</span>
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
            Reset filters
          </Button>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
