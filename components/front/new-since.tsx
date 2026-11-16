'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { mutedArgs } from '@/lib/feed';
import { readGuestMutes } from '@/lib/guest-prefs';
import { useI18n } from '@/lib/i18n/client';
import { subscribeVisit, visitSince, visitWhen, visitWhenText } from '@/lib/last-visit';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/** When the reader's previous visit ended (lib/last-visit.ts); null on the server and on a first visit. */
function useLastVisit(): number | null {
  return useSyncExternalStore(subscribeVisit, visitSince, () => null);
}

/**
 * Under Latest dispatches: "12 new stories since your last visit this morning." Counted like the
 * latest list the reader would open (their sections, their mutes); nothing on a first visit, when
 * nothing is new, or while the count is on its way (it never pushes the lead story down: it sits in
 * the column beside it, and under it on phones).
 */
export function NewSince({ categoryIds, signedIn, className }: { categoryIds: string[]; signedIn: boolean; className?: string }) {
  const i18n = useI18n();
  const { t, plural, rich } = i18n;
  const since = useLastVisit();
  const [counted, setCounted] = useState<{ since: number; count: number; at: number } | null>(null);
  const sections = categoryIds.join(',');

  useEffect(() => {
    if (since === null) return;
    let live = true;
    const ids = sections ? sections.split(',') : [];
    createClient()
      .rpc('get_feed', {
        p_category_ids: ids.length ? ids : undefined,
        p_since: new Date(since + 1).toISOString(),
        p_limit: 1,
        // A visitor's muted papers and words live in this browser; an account's are in the database.
        ...(signedIn ? {} : mutedArgs(readGuestMutes())),
      })
      .then(({ data, error }) => {
        if (!live || error) return;
        setCounted({ since, count: Number(data?.[0]?.total_count ?? 0), at: Date.now() });
      });
    return () => {
      live = false;
    };
  }, [since, sections, signedIn]);

  if (since === null || !counted || counted.since !== since || counted.count === 0) return null;
  return (
    <p className={cn('text-pretty text-[0.95rem] italic text-muted-foreground', className)}>
      {rich(t.visit.count, {
        count: <strong className="font-semibold not-italic text-(--ink-accent)">{plural(t.visit.stories, counted.count)}</strong>,
        when: visitWhenText(visitWhen(since, counted.at), i18n),
      })}
    </p>
  );
}
