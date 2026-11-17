import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isResting } from '../lib/ingestion/backoff';
import { dropRepeatedTitles, improveImageUrl, isAdvertTitle, normalizeItem, normalizeUrl, parseFeedDate, titleKey, undatedFallback } from '../lib/ingestion/normalize';
import { countStoryWords, readingMinutesFor } from '../lib/ingestion/enrich';
import type { ParsedFeedItem } from '../lib/ingestion/parse-feed';

const NOW = Date.parse('2026-11-12T12:00:00Z');

function item(overrides: Partial<ParsedFeedItem> = {}): ParsedFeedItem {
  return {
    title: 'A perfectly normal headline',
    link: 'https://news.example.com/story',
    summaryHtml: '<p>The summary of the story, long enough to be considered a real summary.</p>',
    contentHtml: null,
    imageUrl: null,
    author: null,
    published: 'Thu, 12 Nov 2026 10:00:00 GMT',
    ...overrides,
  };
}

describe('normalizeUrl', () => {
  it('removes tracking parameters and fragments but keeps real query parameters', () => {
    assert.equal(
      normalizeUrl('https://ex.com/a?id=7&utm_source=rss&utm_medium=feed&at_medium=RSS#comments'),
      'https://ex.com/a?id=7',
    );
    assert.equal(normalizeUrl('https://ex.com/?p=123'), 'https://ex.com/?p=123', 'WordPress ?p= links are kept');
  });

  it('resolves relative and protocol-relative URLs', () => {
    assert.equal(normalizeUrl('/news/1', 'https://ex.com/feed'), 'https://ex.com/news/1');
    assert.equal(normalizeUrl('//cdn.ex.com/img.jpg'), 'https://cdn.ex.com/img.jpg');
  });

  it('rejects non-http(s) and invalid URLs', () => {
    assert.equal(normalizeUrl('javascript:alert(1)'), null);
    assert.equal(normalizeUrl('ftp://ex.com/file'), null);
    assert.equal(normalizeUrl('not a url'), null);
    assert.equal(normalizeUrl(''), null);
  });
});

describe('improveImageUrl', () => {
  it('upgrades known thumbnail URLs', () => {
    assert.equal(
      improveImageUrl('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/c584/live/a.jpg'),
      'https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/c584/live/a.jpg',
    );
    assert.equal(improveImageUrl('https://scx1.b-cdn.net/csz/news/tmb/2022/x.jpg'), 'https://scx1.b-cdn.net/csz/news/800a/2022/x.jpg');
  });

  it('drops broken and oversized images so enrichment can replace them', () => {
    assert.equal(improveImageUrl('https://www.npr.org/templates/story/undefined'), null);
    assert.equal(
      improveImageUrl('https://npr.brightspotcdn.com/dims3/default/strip/false/crop/8640x5760+0+0/resize/8640x5760!/quality/85/?url=x'),
      null,
    );
    assert.equal(improveImageUrl('https://cdn.example.com/photo.jpg'), 'https://cdn.example.com/photo.jpg');
  });
});

describe('parseFeedDate', () => {
  it('parses RFC 822, ISO 8601 and "Z" suffixed dates', () => {
    assert.equal(parseFeedDate('Thu, 12 Nov 2026 11:21:25 GMT')?.toISOString(), '2026-11-12T11:21:25.000Z');
    assert.equal(parseFeedDate('2026-11-12T10:00:00+02:00')?.toISOString(), '2026-11-12T08:00:00.000Z');
    assert.equal(parseFeedDate('Sat, 10 Oct 2026 07:49:45 Z')?.toISOString(), '2026-10-10T07:49:45.000Z');
    assert.equal(parseFeedDate('Thu, 12 Nov 2026 04:37:10 EST')?.toISOString(), '2026-11-12T09:37:10.000Z');
  });

  it('returns null for garbage', () => {
    assert.equal(parseFeedDate('yesterday-ish'), null);
    assert.equal(parseFeedDate(null), null);
  });
});

describe('normalizeItem', () => {
  it('cleans the title and summary and strips feed boilerplate', () => {
    const result = normalizeItem(
      item({
        title: '  Apple &amp; Google <b>agree</b>  ',
        summaryHtml:
          '<p>The two companies agreed on new terms today.</p> The post Apple and Google agree appeared first on Example News.',
      }),
      { now: NOW },
    );
    assert.ok(result);
    assert.equal(result.title, 'Apple & Google agree');
    assert.equal(result.summary, 'The two companies agreed on new terms today.');
  });

  it('takes a newsletter plug out of the summary', () => {
    const result = normalizeItem(
      item({
        summaryHtml:
          'Documents show draft reports backed the reporting. Sign up for Guardian Australia’s breaking news email. The watchdog later changed course.',
      }),
      { now: NOW },
    );
    assert.equal(result?.summary, 'Documents show draft reports backed the reporting. The watchdog later changed course.');
    const cut = normalizeItem(item({ summaryHtml: 'The memorial stood by its account of events, the records show. Sign up for Guardian Aust' }), { now: NOW });
    assert.equal(cut?.summary, 'The memorial stood by its account of events, the records show.');
  });

  it('cuts everything from "The post … appeared first on" on', () => {
    const result = normalizeItem(
      item({
        summaryHtml:
          'Ministers have spent a decade trying to ban it… The post Has the bill been blown up? appeared first on The Spectator Australia. What to read next: Unemployment falls | Parliament needs HR',
      }),
      { now: NOW },
    );
    assert.equal(result?.summary, 'Ministers have spent a decade trying to ban it…');
  });

  it('leaves out sponsored newsletters sent through a news feed', () => {
    for (const summaryHtml of [
      'Presented by EQT Energy & Environment The Big Story Senate steps toward passing permitting reform',
      'Welcome to The Hill’s Defense newsletter {beacon} Defense & National Security The Big Story',
    ]) {
      assert.equal(normalizeItem(item({ title: 'Senate clears hurdle for permitting reform', summaryHtml }), { now: NOW }), null, summaryHtml);
    }
    assert.ok(normalizeItem(item({ summaryHtml: 'The bill was presented by the senator from Ohio on Monday.' }), { now: NOW }));
  });

  it('uses the full content when the summary is too short', () => {
    const result = normalizeItem(
      item({ summaryHtml: 'Short', contentHtml: '<p>This full content paragraph is much longer than the summary.</p>' }),
      { now: NOW },
    );
    assert.equal(result?.summary, 'This full content paragraph is much longer than the summary.');
  });

  it('drops the summary when it only repeats the title', () => {
    const result = normalizeItem(item({ title: 'Same text here', summaryHtml: 'Same text here' }), { now: NOW });
    assert.equal(result?.summary, null);
  });

  it('skips items without a usable title or link', () => {
    assert.equal(normalizeItem(item({ title: '  ' }), { now: NOW }), null);
    assert.equal(normalizeItem(item({ link: null }), { now: NOW }), null);
  });

  it('skips items older than the retention window and clamps future dates', () => {
    assert.equal(normalizeItem(item({ published: '2025-01-01T00:00:00Z' }), { now: NOW, maxAgeDays: 30 }), null);
    const future = normalizeItem(item({ published: '2026-11-13T12:00:00Z' }), { now: NOW });
    assert.equal(future?.published_at, new Date(NOW).toISOString());
  });

  it('cleans author names and drops e-mail addresses', () => {
    assert.equal(normalizeItem(item({ author: 'By Jane Doe' }), { now: NOW })?.author, 'Jane Doe');
    assert.equal(normalizeItem(item({ author: 'news@example.com' }), { now: NOW })?.author, null);
    assert.equal(normalizeItem(item({ author: 'None' }), { now: NOW })?.author, null);
    assert.equal(normalizeItem(item({ author: 'By null' }), { now: NOW })?.author, null);
    // A real name that merely starts like a placeholder stays.
    assert.equal(normalizeItem(item({ author: 'Nonie Smith' }), { now: NOW })?.author, 'Nonie Smith');
  });

  it('normalises the image URL relative to the feed', () => {
    const result = normalizeItem(item({ imageUrl: '/img/photo.jpg' }), { now: NOW, baseUrl: 'https://news.example.com/feed' });
    assert.equal(result?.image_url, 'https://news.example.com/img/photo.jpg');
  });
});

describe('reading time', () => {
  const para = (words: number) => `<p>${Array.from({ length: words }, (_, i) => `word${i}`).join(' ')}</p>`;

  it('counts the paragraphs of the story, not menus, scripts or captions', () => {
    const html = `<html><nav><p>${'menu '.repeat(50)}</p></nav><script>var a = "<p>${'x '.repeat(40)}</p>";</script>
      <article><h1>Title</h1>${para(300)}<p>Share this</p><figure><p>${'caption '.repeat(20)}</p></figure>${para(160)}</article>
      <footer>${para(100)}</footer></html>`;
    assert.equal(countStoryWords(html), 460);
  });

  it('falls back to the whole page when there is no <article>', () => {
    assert.equal(countStoryWords(`<div>${para(20)}${para(30)}</div>`), 50);
  });

  it('turns words into minutes, and says nothing for too little text', () => {
    assert.equal(readingMinutesFor(100), 0);
    assert.equal(readingMinutesFor(200), 1);
    assert.equal(readingMinutesFor(920), 4);
    assert.equal(readingMinutesFor(10_000_000), 600);
  });
});

describe('adverts and betting tips', () => {
  it('keeps sportsbook promotions and betting tips off the paper', () => {
    for (const title of [
      'Use DraftKings promo code to get $200 bonus, free NBA League Pass for 49ers-Cowboys',
      'Use BetMGM bonus code CBSSPORTS to get $1,500 bonus bets for Falcons-Chiefs',
      'Week 10 NFL betting promos: Get over $3,000 in bonuses from betting apps, sportsbooks',
      'Seahawks vs. Raiders odds, NFL Week 10 predictions: Use Polymarket promo code CBSSPORTS',
      '49ers vs. Cowboys prediction, odds, time: NFL Week 10 picks from advanced model',
      'NFL longshot parlay picks, bets, player props for Week 10',
      'Sponsored: The best mattress of 2026',
      // Coupon and deal pages (Wired)
      '1Password Coupon: Score a Free Trial in November 2026',
      'Wayfair Coupons: Up to 80% Off November 2026',
      'Disney Plus Discount Codes: 52% Off November 2026',
      'Klook Promo Code: 20% Off November 2026',
      '10 Best Early Black Friday Headphone Deals (2026): Up to 50% Off',
      'The 21 Best REI Holiday Sale Outdoor Deals (2026)',
      'Thanksgiving Meal Deals Roundup (2026): Walmart, Amazon, Target',
      // Game picks, odds and fantasy-team tips (CBS Sports, Forbes)
      'Rockets vs. Heat NBA picks: A four-game win streak will end in Giannis Antetokounmpo vs. Kevin Durant showdown',
      'College basketball picks, schedule: Predictions for Duke vs. Illinois and more Top 25 games on Tuesday',
      'NFL Week 11 early odds: Bills, Chiefs favored by 16.5 points; Bengals line jumps after blowout',
      'NFL DFS, Ravens vs. Chargers: Top daily Fantasy picks, lineup advice for Monday Night Football',
      'Fantasy Football Week 11 Injury Report: Drake Maye, Brock Bowers And More',
    ]) {
      assert.equal(isAdvertTitle(title), true, title);
      assert.equal(normalizeItem(item({ title }), { now: NOW }), null, title);
    }
  });

  it('keeps the news, even when it mentions odds, codes or promotions', () => {
    for (const title of [
      'Chapecoense crash survivor wins promotion in final game',
      'Pact on South China Sea code of conduct unlikely, as ASEAN leaders gather',
      'UFC 334: Fight card, date, odds and complete guide as Ciryl Gane takes on Josh Hokit',
      'Zuffa Boxing 13 results: Carlos Adames picks up win in promotional debut',
      'Against all odds, the Mars rover wakes up',
      'Here are our favorite deals from REI’s giant Holiday Sale',
      '2027 NFL Draft order, team needs: Full first-round picks for all 32 teams entering Week 11',
      'Black Friday shoppers queue overnight as retailers cut prices',
      'EU agrees to resurrect cooperation deal with Syria',
      'Shares fall 30% after a profit warning',
      'Dodgers vs. Mets: Ohtani homers twice in the opener',
    ]) {
      assert.equal(isAdvertTitle(title), false, title);
    }
  });
});

describe('repeated headlines', () => {
  it('reduces a headline to its words', () => {
    assert.equal(titleKey('  Café owners: "We\'re open!" '), 'cafe owners we re open');
  });

  it('drops a paper\'s second address for the same story, in the feed and from recent days', () => {
    const items = [
      { title: '49ers vs. Cowboys prediction, odds', url: 'https://ex.com/a-best-bets' },
      { title: '49ers vs Cowboys: prediction, odds', url: 'https://ex.com/a' },
      { title: 'Fantasy rankings for Week 10', url: 'https://ex.com/b' },
      { title: 'A new story', url: 'https://ex.com/c' },
    ];
    const kept = dropRepeatedTitles(items, ['Fantasy rankings for week 10']);
    assert.deepEqual(
      kept.map((item) => item.url),
      ['https://ex.com/a-best-bets', 'https://ex.com/c'],
    );
  });
});

describe('undated items', () => {
  const dated = [{ published_at: '2026-11-16T08:00:00.000Z' }, { published_at: null }, { published_at: '2026-11-14T08:00:00.000Z' }];

  it('are dated at the paper\'s previous successful check', () => {
    assert.equal(undatedFallback(dated, '2026-11-16T07:00:00.000Z'), '2026-11-16T07:00:00.000Z');
  });

  it('sink below a new paper\'s dated news on its first check', () => {
    assert.equal(undatedFallback(dated, null), '2026-11-14T08:00:00.000Z');
    assert.equal(undatedFallback([{ published_at: null }], null), null);
  });
});

describe('feeds that keep failing', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');

  it('rest for a few hours after ten failures in a row', () => {
    assert.equal(isResting({ consecutive_failures: 9, last_fetched_at: '2026-11-16T11:00:00Z' }, now), false);
    assert.equal(isResting({ consecutive_failures: 10, last_fetched_at: '2026-11-16T11:00:00Z' }, now), true);
    assert.equal(isResting({ consecutive_failures: 25, last_fetched_at: '2026-11-16T05:00:00Z' }, now), false, 'tried again after 6 hours');
    assert.equal(isResting({ consecutive_failures: 12, last_fetched_at: null }, now), false);
  });
});
