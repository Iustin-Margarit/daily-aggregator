'use client';

import { useMemo, useState } from 'react';
import { Ornament } from '@/components/site/ornament';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
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
  const { t } = useI18n();

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
      {/* The same ledger field and magnifier as the front page's search. */}
      <div className="relative">
        <span className="search-glass pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rotate-[-30deg]" aria-hidden="true">
          <Ornament name="magnifier" className="block h-[1.45rem]" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.toolbar.findPaper}
          className="ledger-field"
          aria-label={t.toolbar.findPaperLabel}
        />
      </div>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-[3px] border-[3px] border-double border-rule/35 bg-card/50 p-1.5">
        {groups.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t.toolbar.noPapers}</p>}
        {groups.map(({ category, sources: groupSources }) => (
          <div key={category.id} className="py-1" data-section={getCategoryStyle(category.name).key ?? undefined}>
            <p className="flex items-center gap-2 px-2 py-1 font-label text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {sectionText(t, getCategoryStyle(category.name).key, category.name).name}
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
                  className="flex w-full items-center gap-2.5 rounded-[2px] px-2 py-2 text-left font-sans text-[0.95rem] hover:bg-foreground/6 focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  {/* A ledger box with a pen tick, as in components/ui/checkbox.tsx. */}
                  <span
                    className={cn(
                      'relative h-5 w-5 shrink-0 rounded-[1px] border-[3px] border-double bg-card',
                      checked ? 'border-(--ink-gold)' : 'border-rule/70',
                    )}
                    aria-hidden="true"
                  >
                    {checked && (
                      <span className="absolute -top-1.5 left-0 block -rotate-6 font-display text-[1.25rem] font-bold leading-none text-(--ink-accent)">✓</span>
                    )}
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
