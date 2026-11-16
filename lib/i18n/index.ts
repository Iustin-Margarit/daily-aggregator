import { createElement, Fragment, type ReactNode } from 'react';
import en, { type Dictionary, type Plural } from '@/lib/i18n/en';

export type { Dictionary, Plural } from '@/lib/i18n/en';

/*
 * The paper's words (lib/i18n/en.ts) and the small kit that prints them: placeholders, plurals,
 * numbers, lists and dates through Intl. Server components get it from getI18n()
 * (lib/i18n/server.ts), client components from useI18n() (lib/i18n/client.tsx); both return the
 * same kit, so a component can move between server and client without changing its text.
 */

/** British English for numbers, lists, plurals and most dates; the masthead keeps the American date it has always printed. */
export const LANG_TAG = 'en-GB';
const MASTHEAD_TAG = 'en-US';

type Vars = Record<string, string | number>;

/** Fills `{name}` placeholders; unknown ones are left as they are. */
export function fmt(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/**
 * Like fmt(), but the placeholders may be React nodes (a link, bold text), so a
 * whole sentence stays one string in the dictionary.
 */
export function rich(template: string, nodes: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  return parts.map((part, index) => createElement(Fragment, { key: index }, index % 2 === 1 ? (part in nodes ? nodes[part] : `{${part}}`) : part));
}

/** "saturday" -> "Saturday": a line that starts with a date starts with a capital. */
export function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(LANG_TAG) + text.slice(1) : text;
}

const plurals = new Intl.PluralRules(LANG_TAG);
const numbers = new Intl.NumberFormat(LANG_TAG);
const lists = new Intl.ListFormat(LANG_TAG, { type: 'conjunction' });

const date = (value: Date, options: Intl.DateTimeFormatOptions, tag = LANG_TAG) => (Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString(tag, options));

export const i18n = {
  t: en,
  fmt,
  rich,
  number: (n: number) => numbers.format(n),
  /** Picks the form for `n` and fills `{n}`: "1 story", "3 stories". */
  plural: (forms: Plural, n: number, vars: Vars = {}) => fmt(plurals.select(n) === 'one' ? forms.one : forms.other, { ...vars, n: numbers.format(n) }),
  /** "World, Science and Health". */
  list: (items: string[]) => lists.format(items),
  dates: {
    /** The masthead: "Saturday, November 14, 2026". */
    masthead: (value: Date) => date(value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }, MASTHEAD_TAG),
    /** The phone header: "Saturday, November 14". */
    short: (value: Date) => date(value, { weekday: 'long', month: 'long', day: 'numeric' }, MASTHEAD_TAG),
    /** "Saturday". */
    weekday: (value: Date) => date(value, { weekday: 'long' }),
    /** "13 November 2026". */
    long: (value: Date) => date(value, { day: 'numeric', month: 'long', year: 'numeric' }),
    /** "14 November" (in UTC, like Wikipedia's anniversaries). */
    dayMonth: (value: Date) => date(value, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
  },
};

export type Translator = typeof i18n;

/** A section's name and description; sections the paper does not know keep their own name. */
export function sectionText(t: Dictionary, key: string | null, name: string): { name: string; description: string } {
  const entry = key && key in t.sections ? (t.sections[key as keyof typeof t.sections] as { name: string; description: string }) : null;
  return entry && typeof entry === 'object' ? entry : { name, description: t.sections.fallback };
}
