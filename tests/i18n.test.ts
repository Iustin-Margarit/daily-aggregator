import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatReadingTime, formatRelativeTime } from '../lib/format';
import { fmt, i18n } from '../lib/i18n';
import { pickEvents } from '../lib/on-this-day';
import { formatClock, prefAttributes } from '../lib/reader-prefs';
import { editionLabel } from '../lib/site';

type Tree = string | number | Tree[] | { [key: string]: Tree };

/** Every leaf of the dictionary as "path" -> value. */
function leaves(tree: Tree, path = '', out = new Map<string, string | number>()) {
  if (typeof tree === 'string' || typeof tree === 'number') out.set(path, tree);
  else if (Array.isArray(tree)) tree.forEach((item, i) => leaves(item, `${path}[${i}]`, out));
  else for (const [key, value] of Object.entries(tree)) leaves(value, path ? `${path}.${key}` : key, out);
  return out;
}

describe('the paper’s words', () => {
  it('has no empty strings and no straight apostrophes', () => {
    for (const [path, text] of leaves(i18n.t as unknown as Tree)) {
      if (typeof text !== 'string') continue;
      assert.ok(text.length > 0, `${path} is empty`);
      assert.ok(!text.includes("'"), `${path} uses ' instead of ’`);
    }
  });

  it('picks the plural form', () => {
    const forms = { one: '{n} story', other: '{n} stories' };
    assert.equal(i18n.plural(forms, 0), '0 stories');
    assert.equal(i18n.plural(forms, 1), '1 story');
    assert.equal(i18n.plural(forms, 1200), '1,200 stories');
  });

  it('joins lists with "and"', () => {
    assert.equal(i18n.list(['World', 'Science', 'Health']), 'World, Science and Health');
  });

  it('prints the masthead date and the day of an anniversary', () => {
    const date = new Date(2026, 10, 14, 12);
    assert.equal(i18n.dates.masthead(date), 'Saturday, November 14, 2026');
    assert.equal(i18n.dates.dayMonth(date), '14 November');
  });

  it('fills placeholders and leaves unknown ones alone', () => {
    assert.equal(fmt('{a} and {b}', { a: 1 }), '1 and {b}');
  });
});

describe('dates, times and counts', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');

  it('writes relative times', () => {
    assert.equal(formatRelativeTime('2026-11-12T11:59:40Z', now), 'just now');
    assert.equal(formatRelativeTime('2026-11-12T11:15:00Z', now), '45m ago');
    assert.equal(formatRelativeTime('2026-11-10T12:00:00Z', now), '2d ago');
  });

  it('writes the reading time', () => {
    assert.equal(formatReadingTime(4), '4 min read');
    assert.equal(formatReadingTime(0), null);
  });

  it('numbers the edition', () => {
    assert.equal(editionLabel(new Date(Date.UTC(2026, 10, 14))), 'Vol. II · No. 318');
  });

  it('reads the time on a 12-hour clock unless the reader chose 24', () => {
    assert.equal(prefAttributes(() => undefined)['data-clock'], '12');
    assert.equal(prefAttributes((name) => (name === 'pref-clock' ? '24' : undefined))['data-clock'], '24');
    assert.equal(formatClock(new Date(2026, 10, 12, 15, 42), '24'), '15:42');
    assert.equal(formatClock(new Date(2026, 10, 12, 15, 42), '12'), '3:42 p.m.');
  });

  it('keeps gentle anniversaries, each starting with a capital', () => {
    const feed = [
      { year: 1889, text: 'the start of a war somewhere, with many killed on both sides.' },
      { year: 1900, text: 'a great museum opens its doors in the heart of the city.' },
      { year: 1950, text: 'the first broadcast of a radio programme for children.' },
      { year: 1990, text: 'a public library opens in an old theatre (pictured).' },
    ];
    const events = pickEvents(feed, 3);
    assert.equal(events.length, 3);
    assert.ok(events.every((event) => !/war/.test(event.text)));
    assert.ok(events[0].text.startsWith('A great museum'));
    assert.equal(events[2].text, 'A public library opens in an old theatre.');
  });
});
