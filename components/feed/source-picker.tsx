'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getCategoryStyle } from '@/lib/category-styles';
import type { Category, SourceOption } from '@/lib/types';
import { cn } from '@/lib/utils';

type SourceListProps = {
  sources: SourceOption[];
  categories: Category[];
  /** Only sources in these categories are offered (empty = all). */
  visibleCategoryIds: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

/** A checklist of newspapers, grouped by section, with a search box. */
export function SourceList({ sources, categories, visibleCategoryIds, selected, onChange }: SourceListProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => visibleCategoryIds.length === 0 || visibleCategoryIds.includes(c.id))
      .map((category) => ({
        category,
        sources: sources.filter((s) => s.category_id === category.id && (!q || s.name.toLowerCase().includes(q))),
      }))
      .filter((group) => group.sources.length > 0);
  }, [sources, categories, visibleCategoryIds, query]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a newspaper…" className="h-10 pl-10" aria-label="Find a newspaper" />
      </div>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background/40 p-1.5">
        {groups.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No newspapers found.</p>}
        {groups.map(({ category, sources: groupSources }) => (
          <div key={category.id} className="py-1" data-section={getCategoryStyle(category.name).key ?? undefined}>
            <p className="flex items-center gap-2 px-2 py-1 font-label text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {category.name}
            </p>
            {groupSources.map((source) => {
              const checked = selected.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(source.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left font-sans text-[0.95rem] hover:bg-accent"
                >
                  <span
                    className={cn(
                      'flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center rounded-md border',
                      checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{source.name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
