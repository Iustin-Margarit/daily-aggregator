import { DICTIONARIES, fmt, translator } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/config';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m ago", "3h ago", "2d ago", then a short date ("il y a 5 min", "hace 3 h", ... in other editions). */
export function formatRelativeTime(date: string | Date, now: number = Date.now(), locale: Locale = 'en'): string {
  const time = typeof date === 'string' ? Date.parse(date) : date.getTime();
  if (Number.isNaN(time)) return '';
  const diff = now - time;
  const words = DICTIONARIES[locale].time;

  if (diff < MINUTE) return words.justNow;
  if (diff < HOUR) return fmt(words.minutes, { n: Math.floor(diff / MINUTE) });
  if (diff < DAY) return fmt(words.hours, { n: Math.floor(diff / HOUR) });
  if (diff < 7 * DAY) return fmt(words.days, { n: Math.floor(diff / DAY) });

  const value = new Date(time);
  const sameYear = value.getFullYear() === new Date(now).getFullYear();
  return value.toLocaleDateString(locale === 'en' ? 'en-US' : translator(locale).tag, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "November 12, 2026 at 3:04 PM" (or the edition's own way of writing it). */
export function formatDateTime(date: string | Date, locale: Locale = 'en'): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '';
  return value.toLocaleString(locale === 'en' ? 'en-US' : translator(locale).tag, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '';
  return value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** English only: used by the Newsroom (admin) pages. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "4 min read", or null when the reading time is unknown (null or 0). */
export function formatReadingTime(minutes: number | null | undefined, locale: Locale = 'en'): string | null {
  if (!minutes || minutes < 1) return null;
  return fmt(DICTIONARIES[locale].time.readingTime, { n: Math.round(minutes) });
}
