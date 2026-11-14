'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { saveTopics } from '@/app/actions/onboarding';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { getCategoryStyle } from '@/lib/category-styles';
import type { Category } from '@/lib/types';

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
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex-col-reverse lg:justify-start">
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
    // Wide screens: a margin column (byline, how many are chosen, the buttons) beside the stamps.
    // Phones: the same, stacked, with the buttons after the stamps.
    <form action={formAction} className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-0">
      <div className="space-y-6 lg:col-start-1 lg:row-start-1 lg:border-r lg:border-rule/40 lg:pr-8">
        {state && !state.ok && state.message && <FormMessage type="error">{state.message}</FormMessage>}

        {isFirstRun && (
          <div className="max-w-sm space-y-2">
            <Label htmlFor="username">Your byline (username)</Label>
            <Input id="username" name="username" defaultValue={username} required minLength={3} maxLength={30} autoComplete="username" />
            <p className="text-xs italic text-muted-foreground">Shown at the top of your paper. You can change it later.</p>
          </div>
        )}

        <div className="flex items-end justify-between gap-4 lg:block">
          <div>
            <p className="label text-(--brass-ink)">In your paper</p>
            <p className="mt-1 font-display text-[1.45rem] font-semibold leading-tight" aria-live="polite">
              {selected.length === 0 ? 'Every section' : `${selected.length} of ${categories.length} sections`}
            </p>
            <p className="mt-1 text-[0.95rem] italic text-muted-foreground">
              {selected.length === 0 ? 'No section chosen yet, so your paper includes them all.' : 'Press a stamp to add or remove it.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 lg:mt-4"
            onClick={() => setSelected(allSelected ? [] : categories.map((c) => c.id))}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </Button>
        </div>
      </div>

      <fieldset className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pl-10">
        <legend className="sr-only">Sections</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
          {categories.map((category, index) => {
            const style = getCategoryStyle(category.name);
            const checked = selected.includes(category.id);
            return (
              <label
                key={category.id}
                data-section={style.key ?? undefined}
                data-chosen={checked || undefined}
                className="section-stamp relative block cursor-pointer rounded-sm has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-ring"
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={category.id}
                  checked={checked}
                  onChange={() => toggle(category.id)}
                  className="sr-only"
                />
                <span className="stamp flex h-full flex-col items-center gap-2.5 text-center">
                  <span className="flex w-full items-center justify-between font-label text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-(--stamp-ink)">
                    <span>No. {String(index + 1).padStart(2, '0')}</span>
                  </span>
                  <Engraving name={style.engraving} className="mx-auto h-16 max-w-[7rem]" />
                  <span>
                    <span className="headline block text-xl text-(--stamp-ink)">{category.name}</span>
                    <span className="mt-1 block text-[0.9rem] leading-snug text-muted-foreground">{style.description}</span>
                  </span>
                  {sourceCounts[category.id] ? (
                    <span className="byline">{sourceCounts[category.id]} newspapers</span>
                  ) : null}
                </span>
                {/* Chosen stamps are franked with a real postmark (docs/ASSETS.md); the others show a faint "Choose" ring. */}
                {checked ? (
                  <span className="postmark pointer-events-none absolute -top-3 right-0 flex items-center gap-1" aria-hidden="true">
                    <Ornament name="postmark-bars" className="h-12 -rotate-[78deg] [--ornament-ink:var(--postmark-ink)]" />
                    <span className="relative block w-[4.4rem]">
                      <Ornament name="postmark-ring" className="block w-full [--ornament-ink:var(--postmark-ink)]" />
                      <span className="absolute inset-0 flex flex-col items-center justify-center font-typewriter leading-none text-(--postmark-ink)">
                        <span className="text-[0.66rem] tracking-[0.1em]">CHOSEN</span>
                        <span className="mt-1 text-[0.7rem]">✦</span>
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="choose-ring pointer-events-none absolute right-2 top-1 w-[4rem]" aria-hidden="true">
                    <Ornament name="postmark-ring" className="block w-full [--ornament-ink:currentColor]" />
                    <span className="absolute inset-0 flex items-center justify-center font-typewriter text-[0.62rem] tracking-[0.1em]">
                      CHOOSE
                    </span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="lg:col-start-1 lg:row-start-2 lg:border-r lg:border-rule/40 lg:pr-8 lg:pt-6">
        <SubmitButtons isFirstRun={isFirstRun} count={selected.length} />
      </div>
    </form>
  );
}
