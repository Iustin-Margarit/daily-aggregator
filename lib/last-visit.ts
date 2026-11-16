/*
 * "New since your last visit": when this browser last had the paper open, kept in localStorage
 * (no account needed, nothing sent anywhere). A visit is the time the paper is looked at with no
 * break longer than half an hour; every story published after the previous visit ended is new.
 * The front page counts them (components/front/new-since.tsx); stories carry no "New" stamp (removed
 * 2026-11-17: the time on each byline already says so). The first visit has nothing to compare with.
 */

import type { Translator } from '@/lib/i18n';

const KEY = 'daily-aggregator:visit:v1';
/** A longer break than this starts a new visit. */
export const VISIT_GAP_MS = 30 * 60_000;

export type Visit = {
  /** When the previous visit ended (ms), or null on the first visit in this browser. */
  since: number | null;
  /** When the paper was last seen in this visit (ms). */
  seen: number;
};

/** The visit at `now`, given the stored one: the same visit after a short break, a new one after a long break. */
export function nextVisit(stored: Visit | null, now: number): Visit {
  if (!stored) return { since: null, seen: now };
  // A clock moved back: start over from now rather than stamp nothing for days.
  if (stored.seen > now) return { since: null, seen: now };
  if (now - stored.seen > VISIT_GAP_MS) return { since: stored.seen, seen: now };
  return { since: stored.since, seen: now };
}

export function parseVisit(raw: string | null): Visit | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Visit>;
    if (typeof value.seen !== 'number' || !Number.isFinite(value.seen)) return null;
    const since = typeof value.since === 'number' && Number.isFinite(value.since) && value.since <= value.seen ? value.since : null;
    return { since, seen: value.seen };
  } catch {
    return null;
  }
}

/**
 * When the last visit was, in words a reader would use (lib/i18n/en.ts, `visit.when`):
 * minutes or hours ago the same day, then "this morning", "yesterday evening", "on Saturday", "on 3 November".
 */
export type VisitWhen =
  | { kind: 'minutes' | 'hours'; n: number }
  | { kind: 'today' | 'yesterday'; part: DayPart }
  | { kind: 'lastNight' }
  | { kind: 'weekday' | 'date'; date: Date };

export type DayPart = 'morning' | 'afternoon' | 'evening';

function dayPart(hour: number): DayPart | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

/** Uses the browser's own time zone (both dates are local times). */
export function visitWhen(since: number, now: number): VisitWhen {
  const minutes = Math.max(1, Math.round((now - since) / 60_000));
  if (minutes < 60) return { kind: 'minutes', n: minutes };
  const then = new Date(since);
  const today = startOfDay(new Date(now));
  const hours = Math.round(minutes / 60);
  if (since >= today && hours < 6) return { kind: 'hours', n: hours };
  const part = dayPart(then.getHours());
  const yesterday = startOfDay(new Date(today - 12 * 3_600_000));
  if (since >= today) {
    // Six hours or more earlier today: after midnight is "last night" (22:00-24:00 today is under two hours ago).
    return part === 'night' ? { kind: 'lastNight' } : { kind: 'today', part };
  }
  if (since >= yesterday) {
    if (part === 'night') return then.getHours() >= 22 ? { kind: 'lastNight' } : { kind: 'yesterday', part: 'morning' };
    return { kind: 'yesterday', part };
  }
  if (today - since < 6 * 24 * 3_600_000) return { kind: 'weekday', date: then };
  return { kind: 'date', date: then };
}

/* The browser store, read through useSyncExternalStore (lib/use-last-visit.ts). */

let current: Visit | null = null;
const listeners = new Set<() => void>();

function read(): Visit | null {
  try {
    return parseVisit(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function write(visit: Visit) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    // Private browsing or full storage: the stamps simply stay away.
  }
}

/** The visit as stored, or a new one: read once per page load (never tells the listeners: it runs while rendering). */
function ensure(): Visit {
  if (!current) {
    current = nextVisit(read(), Date.now());
    write(current);
  }
  return current;
}

/**
 * Looks at the clock again: the same visit goes on, or a new one starts after a long break (another tab,
 * the computer asleep, the tab left open overnight). Run when the tab is hidden or shown, and every few minutes.
 */
function touch() {
  const before = ensure().since;
  // Another tab may have moved the visit on: the stored copy is the latest.
  current = nextVisit(read() ?? current, Date.now());
  write(current);
  if (current.since !== before) listeners.forEach((listener) => listener());
}

let timer: ReturnType<typeof setInterval> | undefined;

export function subscribeVisit(listener: () => void): () => void {
  if (listeners.size === 0) {
    ensure();
    document.addEventListener('visibilitychange', touch);
    window.addEventListener('pagehide', touch);
    window.addEventListener('focus', touch);
    timer = setInterval(touch, 5 * 60_000);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener('visibilitychange', touch);
      window.removeEventListener('pagehide', touch);
      window.removeEventListener('focus', touch);
      clearInterval(timer);
    }
  };
}

/** When the previous visit ended (ms), or null on the first visit in this browser. */
export function visitSince(): number | null {
  return ensure().since;
}

/** The last visit in words: "3 hours ago", "this morning", "on Saturday" (lib/i18n/en.ts, `visit`). */
export function visitWhenText(when: VisitWhen, { t, plural, fmt, dates }: Translator): string {
  const v = t.visit;
  switch (when.kind) {
    case 'minutes':
      return plural(v.minutes, when.n);
    case 'hours':
      return plural(v.hours, when.n);
    case 'today':
      return v.today[when.part];
    case 'yesterday':
      return v.yesterday[when.part];
    case 'lastNight':
      return v.lastNight;
    case 'weekday':
      return fmt(v.weekday, { day: dates.weekday(when.date) });
    case 'date':
      return fmt(v.date, { date: dates.dayMonthLocal(when.date) });
  }
}
