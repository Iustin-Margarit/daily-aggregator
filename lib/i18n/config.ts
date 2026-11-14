/**
 * The paper's editions by language. The reader's choice is kept on this device
 * in a cookie (so the server prints the page in that language at once, with no
 * flash of English) and mirrored in localStorage (lib/i18n/client.tsx), which
 * puts the cookie back if it is ever cleared. News stories themselves keep the
 * language they were written in; only the paper around them is translated.
 */
export const LOCALES = ['en', 'fr', 'es', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'paper-lang';
export const LOCALE_STORAGE_KEY = 'paper-lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export type LocaleInfo = {
  /** The edition's own name, in its own language (the selector lists every edition this way). */
  edition: string;
  /** The ink-stamp monogram on the selector. */
  monogram: string;
  /** <html lang>, also used by the browser for hyphenation in justified columns. */
  htmlLang: string;
  /** Intl locale for numbers, plurals, lists and dates. */
  tag: string;
  /** Open Graph locale. */
  ogLocale: string;
};

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { edition: 'English Edition', monogram: 'EN', htmlLang: 'en-GB', tag: 'en-GB', ogLocale: 'en_GB' },
  fr: { edition: 'Édition française', monogram: 'FR', htmlLang: 'fr', tag: 'fr-FR', ogLocale: 'fr_FR' },
  es: { edition: 'Edición española', monogram: 'ES', htmlLang: 'es', tag: 'es-ES', ogLocale: 'es_ES' },
  de: { edition: 'Deutsche Ausgabe', monogram: 'DE', htmlLang: 'de', tag: 'de-DE', ogLocale: 'de_DE' },
};
