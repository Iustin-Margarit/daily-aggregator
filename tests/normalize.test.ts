import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { improveImageUrl, normalizeItem, normalizeUrl, parseFeedDate } from '../lib/ingestion/normalize';
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
