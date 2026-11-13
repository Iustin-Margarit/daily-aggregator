'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCw, Search, Sparkles, X } from 'lucide-react';
import { SourcePicker } from '@/components/feed/source-picker';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Segmented } from '@/components/ui/segmented';
import type { Category, DateRange, FeedFilters, FeedSort, SourceOption } from '@/lib/types';
import { cn } from '@/lib/utils';

type FeedToolbarProps = {
  filters: FeedFilters;
  onChange: (patch: Partial<FeedFilters>) => void;
  categories: Category[];
  sources: SourceOption[];
  preferredCategoryIds: string[];
  onRefresh: () => void;
  refreshing: boolean;
};

const sectionClass = (active: boolean) =>
  cn(
    'label shrink-0 px-2.5 py-1.5 transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
    active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
  );

export function FeedToolbar({
  filters,
  onChange,
  categories,
  sources,
  preferredCategoryIds,
  onRefresh,
  refreshing,
}: FeedToolbarProps) {
  const [search, setSearch] = useState(filters.search);
  const debounce = useRef<number | null>(null);

  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(
    () => () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    },
    [],
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => onChange({ search: value.trim() }), 350);
  };

  const submitSearch = () => {
    if (debounce.current) window.clearTimeout(debounce.current);
    onChange({ search: search.trim() });
  };

  const toggleCategory = (id: string) => {
    const next = filters.categoryIds.includes(id) ? filters.categoryIds.filter((x) => x !== id) : [...filters.categoryIds, id];
    // Drop source filters that are no longer in a visible section.
    const sourceIds = filters.sourceIds.filter((sourceId) => {
      const categoryId = sources.find((s) => s.id === sourceId)?.category_id;
      return next.length === 0 || (categoryId !== undefined && next.includes(categoryId));
    });
    onChange({ categoryIds: next, sourceIds });
  };

  const showingPreferred =
    preferredCategoryIds.length > 0 &&
    preferredCategoryIds.length === filters.categoryIds.length &&
    preferredCategoryIds.every((id) => filters.categoryIds.includes(id));

  return (
    <div className="border-y border-rule">
      <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search the archive of headlines…"
            className="h-9 w-full border-0 border-b border-input bg-transparent pl-6 pr-8 font-serif text-[1.02rem] italic placeholder:text-muted-foreground/80 focus:border-rule focus:outline-hidden [&::-webkit-search-cancel-button]:hidden"
            aria-label="Search articles"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onChange({ search: '' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented<FeedSort>
            aria-label="Sort articles"
            value={filters.sort}
            onChange={(sort) => onChange({ sort })}
            options={[
              { value: 'latest', label: 'Latest', title: 'Newest first' },
              {
                value: 'for_you',
                label: (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> For you
                  </>
                ),
                title: 'Ranked using your sections and the stories you like and save',
              },
            ]}
          />
          <div className="w-38">
            <NativeSelect aria-label="Time range" value={filters.range} onChange={(event) => onChange({ range: event.target.value as DateRange })}>
              <option value="any">Last 30 days</option>
              <option value="week">Last 7 days</option>
              <option value="today">Last 24 hours</option>
            </NativeSelect>
          </div>
          <SourcePicker
            sources={sources}
            categories={categories}
            visibleCategoryIds={filters.categoryIds}
            selected={filters.sourceIds}
            onChange={(sourceIds) => onChange({ sourceIds })}
          />
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={refreshing} aria-label="Refresh" title="Refresh">
            <RotateCw className={cn(refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-border py-2 scrollbar-none">
        <span className="label mr-2 shrink-0 text-foreground">Sections:</span>
        <button type="button" className={sectionClass(filters.categoryIds.length === 0)} onClick={() => onChange({ categoryIds: [] })} aria-pressed={filters.categoryIds.length === 0}>
          All
        </button>
        {preferredCategoryIds.length > 0 && (
          <button
            type="button"
            className={sectionClass(showingPreferred)}
            onClick={() => onChange({ categoryIds: preferredCategoryIds, sourceIds: [] })}
            aria-pressed={showingPreferred}
          >
            Mine
          </button>
        )}
        <span className="mx-1 h-4 w-px shrink-0 bg-rule/50" aria-hidden="true" />
        {categories.map((category) => {
          const active = filters.categoryIds.includes(category.id);
          return (
            <button key={category.id} type="button" className={sectionClass(active)} onClick={() => toggleCategory(category.id)} aria-pressed={active}>
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
