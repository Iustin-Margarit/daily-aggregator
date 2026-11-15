'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/*
 * Which page of the paper the reader was on before this one, inside this tab.
 * The browser's document.referrer does not change when the app moves between
 * pages itself, so the Back link (components/article/back-link.tsx) asks here.
 * Kept in memory: a reload or a new tab starts with no previous page, and Back
 * then goes to its fixed address instead of out of the site.
 */
let current: string | null = null;
let previous: string | null = null;

/** The path of the page the reader came from in this tab, or null when they arrived from outside. */
export function previousAppPath(): string | null {
  return previous;
}

/** Records each page the reader opens (in the root layout). Renders nothing. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === current) return;
    previous = current;
    current = pathname;
  }, [pathname]);
  return null;
}
