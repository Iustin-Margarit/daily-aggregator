/** Branding in one place. Change these to rename the app. */
export const siteConfig = {
  /** Full product name (metadata, footer). */
  name: 'The Daily Aggregator',
  /** The author, credited in the footer's colophon. */
  author: { name: 'Iustin', url: 'https://github.com/Iustin-Margarit' },
  /** The newspaper title shown in the masthead and browser tabs. */
  masthead: 'The Daily Aggregator',
  /** Short name for tight spaces. */
  shortName: 'Daily Aggregator',
  // The motto, tagline and description are translated: see masthead.motto and meta.* in lib/i18n/dictionaries.
};

/**
 * "Vol. II · No. 316" - volume counts years since launch, number is the day of
 * the year. `template` is the edition's wording (masthead.volNo: "Vol. {vol} · N° {no}", ...).
 */
export function editionLabel(date: Date = new Date(), template = 'Vol. {vol} · No. {no}'): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const volume = Math.max(1, date.getUTCFullYear() - 2024);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][volume - 1] ?? String(volume);
  return template.replace('{vol}', roman).replace('{no}', String(dayOfYear));
}
