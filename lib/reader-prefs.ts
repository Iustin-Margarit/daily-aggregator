/**
 * Reading preferences kept on this device (like the morning / night edition):
 * stored in cookies, so the server prints the page the reader's way at once
 * (as data-* attributes on <html>, read by the styles), with no flash.
 *
 * - clock:   the masthead's local time and the story datelines, 12- or 24-hour;
 * - banner:  the street under the masthead, moving, still or hidden;
 * - photos:  news photographs with the archival look, or in their natural colours;
 * - columns: justified text like a printed column, or ragged right (easier for some readers).
 */
export const READER_PREFS = {
  clock: { values: ['12', '24'], fallback: '12' },
  banner: { values: ['moving', 'still', 'hidden'], fallback: 'moving' },
  photos: { values: ['archival', 'natural'], fallback: 'archival' },
  columns: { values: ['justified', 'ragged'], fallback: 'justified' },
} as const;

export type ReaderPref = keyof typeof READER_PREFS;
export type ReaderPrefValue<K extends ReaderPref> = (typeof READER_PREFS)[K]['values'][number];

export const prefCookieName = (name: ReaderPref) => `pref-${name}`;

export function isPrefValue<K extends ReaderPref>(name: K, value: string | undefined): value is ReaderPrefValue<K> {
  return value !== undefined && (READER_PREFS[name].values as readonly string[]).includes(value);
}

/** The data-* attributes for <html>, from the reader's cookies (unknown values fall back to the defaults). */
export function prefAttributes(getCookie: (name: string) => string | undefined): Record<`data-${ReaderPref}`, string> {
  const out = {} as Record<`data-${ReaderPref}`, string>;
  for (const name of Object.keys(READER_PREFS) as ReaderPref[]) {
    const value = getCookie(prefCookieName(name));
    out[`data-${name}`] = isPrefValue(name, value) ? value : READER_PREFS[name].fallback;
  }
  return out;
}

/** "3:42 p.m." or "15:42". */
export function formatClock(date: Date, clock: ReaderPrefValue<'clock'>): string {
  if (clock === '24') return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace('AM', 'a.m.').replace('PM', 'p.m.');
}
