'use client';

import { useSyncExternalStore } from 'react';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

// One timer for every "3h ago" on the page (a page of stories has dozens), ticking once a minute.
const listeners = new Set<() => void>();
let timer = 0;
function subscribeMinutes(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = window.setInterval(() => listeners.forEach((tick) => tick()), 60_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(timer);
      timer = 0;
    }
  };
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

/** Relative time ("3h ago") that refreshes every minute; full date on hover. */
export function TimeAgo({ date, className }: { date: string; className?: string }) {
  const minute = useSyncExternalStore(subscribeMinutes, currentMinute, currentMinute);
  return (
    <time dateTime={date} title={formatDateTime(date)} className={className} suppressHydrationWarning>
      {formatRelativeTime(date, minute * 60_000)}
    </time>
  );
}
