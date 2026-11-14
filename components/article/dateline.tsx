'use client';

import { TimeAgo } from '@/components/site/time-ago';
import { translator } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/config';
import { formatClock, type ReaderPrefValue } from '@/lib/reader-prefs';
import { useClientValue } from '@/lib/use-client-value';
import { useReaderPref } from '@/lib/use-reader-pref';

/** "Friday|13 November 2026|10:42 p.m." (or 22:42) in the reader's own time zone (the server may be elsewhere). */
function localParts(iso: string, clock: ReaderPrefValue<'clock'>, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '||';
  const { dates } = translator(locale);
  return `${dates.weekday(date)}|${dates.long(date)}|${formatClock(date, clock, locale)}`;
}

/**
 * The story's dateline, printed in the page's margin column like an old
 * broadsheet: when it was filed (in the reader's time) and how long ago.
 * On narrow screens it runs as one centred line instead.
 */
export function Dateline({ publishedAt }: { publishedAt: string }) {
  const clock = useReaderPref('clock');
  const { t, fmt, locale } = useI18n();
  const [weekday, day, time] = useClientValue(() => localParts(publishedAt, clock, locale), '||').split('|');
  return (
    <p className="flex flex-wrap items-baseline justify-center gap-x-2 text-center lg:block lg:text-left">
      <span className="font-display text-[1.25rem] font-semibold italic lg:block lg:text-[1.4rem]">{weekday || ' '}</span>
      <span className="text-[0.98rem] lg:mt-0.5 lg:block">{day}</span>
      <span className="text-[0.98rem] text-muted-foreground lg:block">{time && fmt(t.article.at, { time })}</span>
      <span className="font-label text-[0.82rem] text-muted-foreground lg:mt-1 lg:block">
        (<TimeAgo date={publishedAt} />)
      </span>
    </p>
  );
}
