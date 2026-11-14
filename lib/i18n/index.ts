import { createElement, Fragment, type ReactNode } from 'react';
import { LOCALE_INFO, type Locale } from '@/lib/i18n/config';
import de from '@/lib/i18n/dictionaries/de';
import en, { type Dictionary } from '@/lib/i18n/dictionaries/en';
import es from '@/lib/i18n/dictionaries/es';
import fr from '@/lib/i18n/dictionaries/fr';

export type { Dictionary } from '@/lib/i18n/dictionaries/en';
export type { Locale } from '@/lib/i18n/config';

/*
 * A small translation kit with no outside service: plain dictionaries, one per
 * edition, and Intl for plurals, numbers, lists and dates. Server components
 * get it from getI18n() (lib/i18n/server.ts), client components from useI18n()
 * (lib/i18n/client.tsx).
 */

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fr, es, de };

export type Plural = { one: string; other: string };
type Vars = Record<string, string | number>;

/** Fills `{name}` placeholders; unknown ones are left as they are. */
export function fmt(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/**
 * Like fmt(), but the placeholders may be React nodes (a link, bold text), so a
 * whole sentence stays one string in the dictionary and each language can put
 * the link where its grammar wants it.
 */
export function rich(template: string, nodes: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  return parts.map((part, index) => createElement(Fragment, { key: index }, index % 2 === 1 ? (part in nodes ? nodes[part] : `{${part}}`) : part));
}

/** "Saturday" -> "Saturday", "samedi" -> "Samedi": dates printed on their own line start with a capital. */
export function capitalize(text: string, tag: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(tag) + text.slice(1) : text;
}

function makeTranslator(locale: Locale) {
  const t = DICTIONARIES[locale];
  const { tag } = LOCALE_INFO[locale];
  const plurals = new Intl.PluralRules(tag);
  const numbers = new Intl.NumberFormat(tag);
  const lists = new Intl.ListFormat(tag, { type: 'conjunction' });
  // English keeps the dates it has always printed: "Saturday, November 14, 2026" on the masthead.
  const mastheadTag = locale === 'en' ? 'en-US' : tag;

  const date = (value: Date, options: Intl.DateTimeFormatOptions, useTag = tag) =>
    Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString(useTag, options);

  return {
    locale,
    tag,
    t,
    fmt,
    rich,
    number: (n: number) => numbers.format(n),
    /** Picks the plural form for `n` (French counts 0 as singular, as it should) and fills `{n}`. */
    plural: (forms: Plural, n: number, vars: Vars = {}) => fmt(plurals.select(n) === 'one' ? forms.one : forms.other, { ...vars, n: numbers.format(n) }),
    /** "World, Science and Health", "Monde, Sciences et Santé", ... */
    list: (items: string[]) => lists.format(items),
    dates: {
      /** The masthead: "Saturday, November 14, 2026", "Samedi 14 novembre 2026". */
      masthead: (value: Date) => capitalize(date(value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }, mastheadTag), tag),
      /** The phone header: "Saturday, November 14". */
      short: (value: Date) => capitalize(date(value, { weekday: 'long', month: 'long', day: 'numeric' }, mastheadTag), tag),
      /** "Saturday", "Samedi". */
      weekday: (value: Date) => capitalize(date(value, { weekday: 'long' }), tag),
      /** "13 November 2026", "13 novembre 2026". */
      long: (value: Date) => date(value, { day: 'numeric', month: 'long', year: 'numeric' }),
      /** "14 November", "14 de noviembre", "14. November" (in UTC, like Wikipedia's anniversaries). */
      dayMonth: (value: Date) => date(value, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    },
  };
}

export type Translator = ReturnType<typeof makeTranslator>;

const translators = new Map<Locale, Translator>();

/** The translation kit for one edition (made once per language and kept). */
export function translator(locale: Locale): Translator {
  let found = translators.get(locale);
  if (!found) {
    found = makeTranslator(locale);
    translators.set(locale, found);
  }
  return found;
}

/** A section's name and description in the reader's language; sections the paper does not know keep their own name. */
export function sectionText(t: Dictionary, key: string | null, name: string): { name: string; description: string } {
  const entry = key && key in t.sections ? (t.sections[key as keyof typeof t.sections] as { name: string; description: string }) : null;
  return entry && typeof entry === 'object' ? entry : { name, description: t.sections.fallback };
}
