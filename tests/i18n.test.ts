import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatReadingTime, formatRelativeTime } from '../lib/format';
import { DICTIONARIES, fmt, translator } from '../lib/i18n';
import { isLocale, LOCALES } from '../lib/i18n/config';
import { pickEvents } from '../lib/on-this-day';
import { formatClock, prefAttributes } from '../lib/reader-prefs';
import { editionLabel } from '../lib/site';
import { normalizeMutedKeyword, validateUsername } from '../lib/validation';

type Tree = string | number | Tree[] | { [key: string]: Tree };

/** Every leaf of a dictionary as "path" -> value. */
function leaves(tree: Tree, path = '', out = new Map<string, string | number>()) {
  if (typeof tree === 'string' || typeof tree === 'number') out.set(path, tree);
  else if (Array.isArray(tree)) tree.forEach((item, i) => leaves(item, `${path}[${i}]`, out));
  else for (const [key, value] of Object.entries(tree)) leaves(value, path ? `${path}.${key}` : key, out);
  return out;
}

const placeholders = (text: string | number) => (typeof text === 'string' ? [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);

describe('edition dictionaries', () => {
  const english = leaves(DICTIONARIES.en as unknown as Tree);

  for (const locale of LOCALES.filter((l) => l !== 'en')) {
    const other = leaves(DICTIONARIES[locale] as unknown as Tree);

    it(`${locale} has exactly the English keys and list lengths`, () => {
      assert.deepEqual([...other.keys()].sort(), [...english.keys()].sort());
    });

    it(`${locale} keeps every {placeholder} of the English text`, () => {
      for (const [path, text] of english) assert.deepEqual(placeholders(other.get(path) ?? ''), placeholders(text), `${locale} ${path}`);
    });

    it(`${locale} has no empty strings and no straight apostrophes`, () => {
      for (const [path, text] of other) {
        if (typeof text !== 'string') continue;
        assert.ok(text.length > 0, `${locale} ${path} is empty`);
        assert.ok(!text.includes("'"), `${locale} ${path} uses ' instead of ’`);
      }
    });
  }

  it('French puts a non-breaking space before : ; ? ! and inside « »', () => {
    for (const [path, text] of leaves(DICTIONARIES.fr as unknown as Tree)) {
      if (typeof text !== 'string') continue;
      assert.ok(!/ [:;?!»]/.test(text) && !/« /.test(text), `fr ${path}: ${text}`);
    }
  });
});

describe('translator', () => {
  it('picks plural forms the way each language counts', () => {
    const forms = { one: '{n} one', other: '{n} other' };
    assert.equal(translator('en').plural(forms, 0), '0 other');
    assert.equal(translator('en').plural(forms, 1), '1 one');
    // French counts zero as singular ("0 article").
    assert.equal(translator('fr').plural(forms, 0), '0 one');
    assert.equal(translator('es').plural(forms, 0), '0 other');
    assert.equal(translator('de').plural(forms, 2), '2 other');
  });

  it('joins lists with the edition’s own "and"', () => {
    assert.equal(translator('en').list(['World', 'Science', 'Health']), 'World, Science and Health');
    assert.equal(translator('fr').list(['Monde', 'Sciences', 'Santé']), 'Monde, Sciences et Santé');
    assert.equal(translator('es').list(['Política', 'Salud']), 'Política y Salud');
    assert.equal(translator('de').list(['Welt', 'Sport']), 'Welt und Sport');
  });

  it('prints dates in the edition’s language, a dateline starting with a capital', () => {
    const date = new Date(2026, 10, 14, 12);
    assert.equal(translator('en').dates.masthead(date), 'Saturday, November 14, 2026');
    assert.equal(translator('fr').dates.masthead(date), 'Samedi 14 novembre 2026');
    assert.equal(translator('es').dates.masthead(date), 'Sábado, 14 de noviembre de 2026');
    assert.equal(translator('de').dates.masthead(date), 'Samstag, 14. November 2026');
    assert.equal(translator('fr').dates.weekday(date), 'Samedi');
  });

  it('fills placeholders and leaves unknown ones alone', () => {
    assert.equal(fmt('{a} and {b}', { a: 1 }), '1 and {b}');
  });
});

describe('edition-aware helpers', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');

  it('writes relative times in each language', () => {
    assert.equal(formatRelativeTime('2026-11-12T11:15:00Z', now, 'en'), '45m ago');
    assert.equal(formatRelativeTime('2026-11-12T11:15:00Z', now, 'fr'), 'il y a 45 min');
    assert.equal(formatRelativeTime('2026-11-12T07:00:00Z', now, 'es'), 'hace 5 h');
    assert.equal(formatRelativeTime('2026-11-10T12:00:00Z', now, 'de'), 'vor 2 Tg.');
    assert.equal(formatRelativeTime('2026-11-12T11:59:40Z', now, 'fr'), 'à l’instant');
  });

  it('writes the reading time in each language', () => {
    assert.equal(formatReadingTime(4, 'en'), '4 min read');
    assert.equal(formatReadingTime(4, 'es'), '4 min de lectura');
  });

  it('numbers the edition in each language', () => {
    const day = new Date(Date.UTC(2026, 10, 14));
    assert.equal(editionLabel(day), 'Vol. II · No. 318');
    assert.equal(editionLabel(day, DICTIONARIES.fr.masthead.volNo), 'Vol. II · N° 318');
    assert.equal(editionLabel(day, DICTIONARIES.de.masthead.volNo), 'Jg. II · Nr. 318');
  });

  it('reads the time on a 24-hour clock in the continental editions unless the reader chose otherwise', () => {
    assert.equal(prefAttributes(() => undefined, 'fr')['data-clock'], '24');
    assert.equal(prefAttributes(() => undefined, 'en')['data-clock'], '12');
    assert.equal(prefAttributes((name) => (name === 'pref-clock' ? '12' : undefined), 'de')['data-clock'], '12');
    assert.equal(formatClock(new Date(2026, 10, 12, 15, 42), '24', 'fr'), '15:42');
  });

  it('gives validation messages in the reader’s language', () => {
    assert.equal(validateUsername('jo', DICTIONARIES.fr.validation), DICTIONARIES.fr.validation.usernameShort);
    assert.deepEqual(normalizeMutedKeyword('x', DICTIONARIES.es.validation), { error: DICTIONARIES.es.validation.wordShort });
  });

  it('keeps gentle anniversaries in other languages too, starting each with a capital', () => {
    const feed = [
      { year: 1889, text: 'début de la guerre de quelque part, avec de nombreux morts.' },
      { year: 1900, text: 'inauguration d’un grand musée au cœur de la ville.' },
      { year: 1950, text: 'première diffusion d’une émission de radio pour enfants.' },
      { year: 1990, text: 'ouverture d’une bibliothèque publique dans un ancien théâtre.' },
    ];
    const events = pickEvents(feed, 3, 'fr');
    assert.equal(events.length, 3);
    assert.ok(events.every((event) => !/guerre/.test(event.text)));
    assert.ok(events[0].text.startsWith('Inauguration'));
  });

  it('only accepts the editions it knows', () => {
    assert.ok(isLocale('fr'));
    assert.ok(!isLocale('it'));
    assert.ok(!isLocale('<script>'));
  });
});
