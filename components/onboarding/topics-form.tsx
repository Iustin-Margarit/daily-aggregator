'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { saveSections, saveTopics } from '@/app/actions/onboarding';
import { useToast } from '@/components/ui/toast';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import type { Category } from '@/lib/types';

type TopicsFormProps = {
  categories: Category[];
  selectedIds: string[];
  isFirstRun: boolean;
  username: string;
  sourceCounts: Record<string, number>;
};

/** A new account's first visit: the byline and the sections go in together, with Continue. */
function SubmitButtons({ count }: { count: number }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get('intent');
  const { t, plural } = useI18n();
  const w = t.onboarding;
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex-col-reverse lg:justify-start">
      <Button type="submit" name="intent" value="skip" variant="ghost" disabled={pending}>
        {pending && intent === 'skip' && <Spinner />}
        {w.skip}
      </Button>
      <Button type="submit" name="intent" value="save" disabled={pending} className="sm:min-w-44">
        {pending && intent !== 'skip' && <Spinner />}
        {count > 0 ? plural(w.continueWith, count) : w.continueAll}
      </Button>
    </div>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Every other visit saves each press at once (no Save button). Quick presses are
 * gathered for a moment and sent as one choice, one save at a time; a change still
 * waiting when the reader leaves the page is sent on the way out.
 */
function useSaveAsYouGo(enabled: boolean) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const { showToast } = useToast();
  const { t } = useI18n();
  const waiting = useRef<string[] | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const flush = async () => {
    if (busy.current) return;
    busy.current = true;
    while (waiting.current) {
      const ids = waiting.current;
      waiting.current = null;
      setStatus('saving');
      const result = await saveSections(ids).catch(() => ({ ok: false, message: undefined }));
      if (!result.ok) {
        showToast({ type: 'error', title: result.message || t.common.somethingWrong });
        setStatus('idle');
        busy.current = false;
        return;
      }
    }
    busy.current = false;
    setStatus('saved');
  };

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (waiting.current && !busy.current) void saveSections(waiting.current);
    },
    [],
  );

  const save = (ids: string[]) => {
    if (!enabled) return;
    waiting.current = ids;
    setStatus('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 300);
  };
  return { status, save };
}

export function TopicsForm({ categories, selectedIds, isFirstRun, username, sourceCounts }: TopicsFormProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [state, formAction] = useActionState(saveTopics, null);
  const { t, fmt, plural } = useI18n();
  const w = t.onboarding;
  const { status, save } = useSaveAsYouGo(!isFirstRun);

  const choose = (next: string[]) => {
    setSelected(next);
    save(next);
  };
  const toggle = (id: string) => choose(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allSelected = selected.length === categories.length;

  return (
    // Wide screens: a margin column (byline, how many are chosen, the buttons) beside the stamps.
    // Phones: the same, stacked, with the buttons after the stamps.
    <form action={formAction} className="grid grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-0">
      <div className="space-y-6 lg:col-start-1 lg:row-start-1 lg:border-r lg:border-rule/40 lg:pr-8">
        {state && !state.ok && state.message && <FormMessage type="error">{state.message}</FormMessage>}

        {isFirstRun && (
          <div className="max-w-sm space-y-2">
            <Label htmlFor="username">{w.byline}</Label>
            <Input id="username" name="username" defaultValue={username} required minLength={3} maxLength={30} autoComplete="username" />
            <p className="text-xs italic text-muted-foreground">{w.bylineHint}</p>
          </div>
        )}

        {/* Phones: one compact row (how many, and whether it is saved) with Select all beside it; the label and
            the "press a stamp" sentence only show in the wide margin column. */}
        <div className="flex items-center justify-between gap-3 lg:block">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 lg:block">
            <p className="label hidden text-(--brass-ink) lg:block">{w.inYourPaper}</p>
            <p className="font-display text-[1.15rem] font-semibold leading-tight lg:mt-1 lg:text-[1.45rem]" aria-live="polite">
              {selected.length === 0 ? w.everySection : plural(w.countOf, selected.length, { total: categories.length })}
            </p>
            <p className="mt-1 hidden text-pretty text-[0.95rem] italic text-muted-foreground lg:block">
              {selected.length === 0 ? w.noneYet : isFirstRun ? w.pressStamp : w.pressStampAuto}
            </p>
            {!isFirstRun && (
              <p className="flex items-center gap-1.5 font-label text-[0.8rem] font-medium text-(--brass-ink) lg:mt-1.5 lg:h-5 lg:text-[0.85rem]" role="status">
                {status === 'saving' && (
                  <>
                    <Spinner className="size-3.5" />
                    {w.saving}
                  </>
                )}
                {status === 'saved' && <>✓ {w.saved}</>}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 lg:mt-4"
            onClick={() => choose(allSelected ? [] : categories.map((c) => c.id))}
          >
            {allSelected ? w.clearAll : w.selectAll}
          </Button>
        </div>
      </div>

      <fieldset className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pl-10">
        <legend className="sr-only">{w.legend}</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
          {categories.map((category, index) => {
            const style = getCategoryStyle(category.name);
            const section = sectionText(t, style.key, category.name);
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
                {/* A container: the section's name shrinks to the stamp's width ("Entertainment" on a phone). */}
                <span className="stamp @container flex h-full flex-col items-center gap-2.5 text-center">
                  <span className="flex w-full items-center justify-between font-label text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-(--stamp-ink)">
                    <span>{fmt(t.sections.stampNo, { n: String(index + 1).padStart(2, '0') })}</span>
                  </span>
                  <Engraving name={style.engraving} className="mx-auto h-16 max-w-[min(7rem,100%)]" />
                  <span className="w-full min-w-0 px-1">
                    {/* Sized to the stamp (11.5% of its width): "Entertainment" or "Divertissement" keep clear of the inner
                        rule on a 320px phone. If a phone's own text size makes it larger still, it breaks with a hyphen. */}
                    <span className="headline block text-[min(1.2rem,11.5cqi)] text-(--stamp-ink) [overflow-wrap:anywhere] hyphens-auto">{section.name}</span>
                    <span className="mt-1 block break-words text-[0.9rem] leading-snug text-muted-foreground">{section.description}</span>
                  </span>
                  {sourceCounts[category.id] ? (
                    <span className="byline">{plural(w.newspapers, sourceCounts[category.id])}</span>
                  ) : null}
                </span>
                {/* Chosen stamps are franked with a real postmark (docs/ASSETS.md); the others show a faint "Choose" ring. */}
                {checked ? (
                  <span className="postmark pointer-events-none absolute -top-3 right-0 flex items-center gap-1" aria-hidden="true">
                    <Ornament name="postmark-bars" className="h-12 -rotate-[78deg] [--ornament-ink:var(--postmark-ink)]" />
                    <span className="relative block w-[4.4rem]">
                      <Ornament name="postmark-ring" className="block w-full [--ornament-ink:var(--postmark-ink)]" />
                      <span className="absolute inset-0 flex flex-col items-center justify-center font-typewriter leading-none text-(--postmark-ink)">
                        {/* An inked tick: chosen reads at a glance, before the word. */}
                        <svg viewBox="0 0 24 24" className="ink-tick mb-0.5 w-[1.15rem]" aria-hidden="true">
                          <path d="M4 12.5l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[0.62rem] font-bold tracking-[0.1em]">{w.chosen}</span>
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="choose-ring pointer-events-none absolute right-2 top-1 w-[4rem]" aria-hidden="true">
                    {/* A faint dashed ring, pencilled in where the postmark will go; only a chosen stamp gets the real one. */}
                    <span className="choose-ring-circle block aspect-square w-full rounded-full border-[1.5px] border-dashed border-current" />
                    <span className="absolute inset-0 flex items-center justify-center font-typewriter text-[0.68rem] tracking-[0.08em]">
                      {w.choose}
                    </span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 lg:mt-0 lg:col-start-1 lg:row-start-2 lg:border-r lg:border-rule/40 lg:pr-8 lg:pt-6">
        {isFirstRun ? (
          <SubmitButtons count={selected.length} />
        ) : (
          <Button variant="outline" asChild className="w-full sm:w-auto lg:w-full">
            <Link href="/feed">{w.toFrontPage}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
