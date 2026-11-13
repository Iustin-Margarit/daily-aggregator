'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { saveTopics } from '@/app/actions/onboarding';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getCategoryStyle } from '@/lib/category-styles';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

type TopicsFormProps = {
  categories: Category[];
  selectedIds: string[];
  isFirstRun: boolean;
  username: string;
  sourceCounts: Record<string, number>;
};

function SubmitButtons({ isFirstRun, count }: { isFirstRun: boolean; count: number }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get('intent');
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {isFirstRun ? (
        <Button type="submit" name="intent" value="skip" variant="ghost" disabled={pending}>
          {pending && intent === 'skip' && <Spinner />}
          Skip for now
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link href="/feed">Cancel</Link>
        </Button>
      )}
      <Button type="submit" name="intent" value="save" disabled={pending} className="sm:min-w-44">
        {pending && intent !== 'skip' && <Spinner />}
        {isFirstRun ? (count > 0 ? `Continue with ${count} section${count === 1 ? '' : 's'}` : 'Continue with every section') : 'Save sections'}
      </Button>
    </div>
  );
}

export function TopicsForm({ categories, selectedIds, isFirstRun, username, sourceCounts }: TopicsFormProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [state, formAction] = useActionState(saveTopics, null);

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const allSelected = selected.length === categories.length;

  return (
    <form action={formAction} className="space-y-8">
      {state && !state.ok && state.message && <FormMessage type="error">{state.message}</FormMessage>}

      {isFirstRun && (
        <div className="max-w-sm space-y-2">
          <Label htmlFor="username" className="label">Your byline (username)</Label>
          <Input id="username" name="username" defaultValue={username} required minLength={3} maxLength={30} autoComplete="username" />
          <p className="text-xs italic text-muted-foreground">Printed under your letters to the editor. You can change it later.</p>
        </div>
      )}

      <fieldset>
        <div className="mb-3 flex items-end justify-between gap-4 border-b border-rule pb-1.5">
          <legend className="label text-foreground">
            Sections <span className="text-muted-foreground">· {selected.length} selected</span>
          </legend>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? [] : categories.map((c) => c.id))}
            className="label text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const style = getCategoryStyle(category.name);
            const Icon = style.icon;
            const checked = selected.includes(category.id);
            return (
              <label
                key={category.id}
                className={cn(
                  'relative flex cursor-pointer flex-col gap-3 border bg-card p-4 text-center transition-colors',
                  'has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-ring',
                  checked ? 'border-rule shadow-[inset_0_0_0_3px_hsl(var(--card)),inset_0_0_0_4px_hsl(var(--rule))]' : 'border-rule/40 hover:border-rule',
                )}
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={category.id}
                  checked={checked}
                  onChange={() => toggle(category.id)}
                  className="sr-only"
                />
                <span className="label mx-auto border border-border px-2 py-0.5 text-[0.6rem] text-muted-foreground">
                  Section {String(index + 1).padStart(2, '0')}
                </span>
                <Icon className="mx-auto h-7 w-7" strokeWidth={1.25} />
                <span>
                  <span className="headline block text-xl">{category.name}</span>
                  <span className="mt-1 block text-sm italic text-muted-foreground">{style.description}</span>
                </span>
                {sourceCounts[category.id] ? (
                  <span className="byline">{sourceCounts[category.id]} sources</span>
                ) : null}
                <span
                  className={cn(
                    'absolute right-3 top-3 flex h-5 w-5 items-center justify-center border transition-colors',
                    checked ? 'border-rule bg-foreground text-background' : 'border-input bg-card',
                  )}
                  aria-hidden="true"
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
              </label>
            );
          })}
        </div>
        {selected.length === 0 && (
          <p className="mt-3 text-sm italic text-muted-foreground">No section selected: your paper will include every section.</p>
        )}
      </fieldset>

      <SubmitButtons isFirstRun={isFirstRun} count={selected.length} />
    </form>
  );
}
