'use client';

import { useEffect, useState } from 'react';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

/** Relative time ("3h ago") that refreshes every minute; full date on hover. */
export function TimeAgo({ date, className }: { date: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time dateTime={date} title={formatDateTime(date)} className={className} suppressHydrationWarning>
      {formatRelativeTime(date, now)}
    </time>
  );
}
