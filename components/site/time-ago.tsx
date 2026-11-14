'use client';

import { useEffect, useState } from 'react';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';

/** Relative time ("3h ago") that refreshes every minute; full date on hover. */
export function TimeAgo({ date, className }: { date: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const { locale } = useI18n();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time dateTime={date} title={formatDateTime(date, locale)} className={className} suppressHydrationWarning>
      {formatRelativeTime(date, now, locale)}
    </time>
  );
}
