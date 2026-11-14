/** Branding in one place. Change these to rename the app. */
export const siteConfig = {
  /** Full product name (metadata, footer). */
  name: 'Personalized News Aggregator',
  /** The newspaper title shown in the masthead and browser tabs. */
  masthead: 'The Daily Aggregator',
  /** Short name for tight spaces. */
  shortName: 'Daily Aggregator',
  tagline: 'Your daily news, curated for you.',
  motto: 'All the news that fits your interests',
  description:
    'A personal newspaper in the style of a Victorian broadsheet: headlines from 33 publishers, arranged by the sections you choose. Free to read, no account needed.',
};

/** "Vol. II · No. 316" - volume counts years since launch, number is the day of the year. */
export function editionLabel(date: Date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const volume = Math.max(1, date.getUTCFullYear() - 2024);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][volume - 1] ?? String(volume);
  return `Vol. ${roman} · No. ${dayOfYear}`;
}

export function editionDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
