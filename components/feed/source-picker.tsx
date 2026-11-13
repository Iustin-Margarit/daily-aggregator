'use client';

import { useMemo, useState } from 'react';
import { Check, Newspaper, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Category, SourceOption } from '@/lib/types';
import { cn } from '@/lib/utils';

type SourcePickerProps = {
  sources: SourceOption[];
  categories: Category[];
  /** Only sources in these categories are offered (empty = all). */
  visibleCategoryIds: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export function SourcePicker({ sources, categories, visibleCategoryIds, selected, onChange }: SourcePickerProps) {
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Newspaper />
          Sources
          {selected.length > 0 && (
            <span className="bg-foreground px-1.5 text-[0.65rem] leading-5 text-background">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a source…"
              className="h-8 pl-8"
              aria-label="Find a source"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {groups.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No sources found.</p>}
          {groups.map(({ category, sources: groupSources }) => (
            <div key={category.id} className="py-1">
              <p className="label px-2 py-1 text-muted-foreground">
                {category.name}
              </p>
              {groupSources.map((source) => {
                const checked = selected.includes(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => toggle(source.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left font-serif text-[0.95rem] hover:bg-accent"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center border',
                        checked ? 'border-rule bg-foreground text-background' : 'border-input',
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{source.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              Show all sources
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
