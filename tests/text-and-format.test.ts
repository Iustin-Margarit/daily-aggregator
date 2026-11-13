import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bannerGradient, isLightColor, shade } from '../lib/colors';
import { FEED_PAGE_SIZE, feedRpcArgs, filtersFromSearchParams, filtersToQueryString, pageCount, pageFromSearchParams, sinceFor } from '../lib/feed';
import { formatRelativeTime } from '../lib/format';
import { safeNextPath } from '../lib/redirect';
import { cleanText, decodeEntities, truncate } from '../lib/text';
import { validateUsername } from '../lib/validation';

describe('text helpers', () => {
  it('decodes named, numeric and double-encoded entities', () => {
    assert.equal(decodeEntities('Tom &amp; Jerry'), 'Tom & Jerry');
    assert.equal(decodeEntities('It&#8217;s &#x2014; ok'), 'It’s — ok');
    assert.equal(decodeEntities('Rock &amp;#8217;n roll'), 'Rock ’n roll');
    assert.equal(decodeEntities('&bogus; stays'), '&bogus; stays');
  });

  it('cleanText strips tags (also entity-encoded ones) and collapses whitespace', () => {
    assert.equal(cleanText('<p>Hello <b>world</b></p>\n\n<script>alert(1)</script>'), 'Hello world');
    assert.equal(cleanText('&lt;p&gt;Encoded &lt;em&gt;markup&lt;/em&gt;&lt;/p&gt;'), 'Encoded markup');
    assert.equal(cleanText(null), '');
  });

  it('truncate cuts on a word boundary', () => {
    assert.equal(truncate('The quick brown fox jumps over the lazy dog', 20), 'The quick brown fox…');
    assert.equal(truncate('Short', 20), 'Short');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  it('formats recent times relatively', () => {
    assert.equal(formatRelativeTime('2026-11-12T11:59:40Z', now), 'just now');
    assert.equal(formatRelativeTime('2026-11-12T11:15:00Z', now), '45m ago');
    assert.equal(formatRelativeTime('2026-11-12T07:00:00Z', now), '5h ago');
    assert.equal(formatRelativeTime('2026-11-10T12:00:00Z', now), '2d ago');
  });
  it('falls back to a date for older items', () => {
    assert.equal(formatRelativeTime('2026-10-01T12:00:00Z', now), 'Oct 1');
    assert.equal(formatRelativeTime('2025-10-01T12:00:00Z', now), 'Oct 1, 2025');
  });
});

describe('feed filters', () => {
  const categories = [
    { id: 'c1', name: 'Technology', sort_order: 1 },
    { id: 'c2', name: 'Science', sort_order: 2 },
    { id: 'c3', name: 'Sports', sort_order: 3 },
  ];
  const preferred = ['c1', 'c2'];

  it('defaults to the preferred topics', () => {
    const filters = filtersFromSearchParams({}, categories, preferred);
    assert.deepEqual(filters, { categoryIds: ['c1', 'c2'], sourceIds: [], search: '', range: 'any', sort: 'latest' });
    assert.equal(filtersToQueryString(filters, categories, preferred), '');
  });

  it('round-trips readable query strings', () => {
    const filters = filtersFromSearchParams({ topics: 'sports', q: 'final', sort: 'for_you', range: 'week' }, categories, preferred);
    assert.deepEqual(filters.categoryIds, ['c3']);
    assert.equal(filtersToQueryString(filters, categories, preferred), '?topics=sports&q=final&range=week&sort=for_you');
    assert.deepEqual(filtersFromSearchParams({ topics: 'all' }, categories, preferred).categoryIds, []);
  });

  it('ignores invalid values', () => {
    const filters = filtersFromSearchParams({ sort: 'random', range: 'year' }, categories, preferred);
    assert.equal(filters.sort, 'latest');
    assert.equal(filters.range, 'any');
  });

  it('reads, writes and offsets page numbers', () => {
    assert.equal(pageFromSearchParams({}), 1);
    assert.equal(pageFromSearchParams({ page: '3' }), 3);
    assert.equal(pageFromSearchParams({ page: '-2' }), 1);
    assert.equal(pageFromSearchParams({ page: 'abc' }), 1);
    const filters = filtersFromSearchParams({}, categories, preferred);
    assert.equal(filtersToQueryString(filters, categories, preferred, 1), '');
    assert.equal(filtersToQueryString(filters, categories, preferred, 4), '?page=4');
    assert.equal(feedRpcArgs(filters, 3, '2026-11-12T12:00:00.000Z').p_offset, 2 * FEED_PAGE_SIZE);
    assert.equal(pageCount(0), 1);
    assert.equal(pageCount(FEED_PAGE_SIZE + 1), 2);
  });

  it('computes the date window', () => {
    assert.equal(sinceFor('today', '2026-11-12T12:00:00.000Z'), '2026-11-11T12:00:00.000Z');
    assert.equal(sinceFor('any', '2026-11-12T12:00:00.000Z'), undefined);
  });
});

describe('safeNextPath', () => {
  it('only allows same-site relative paths', () => {
    assert.equal(safeNextPath('/saved?folder=1'), '/saved?folder=1');
    assert.equal(safeNextPath('https://evil.example'), '/feed');
    assert.equal(safeNextPath('//evil.example'), '/feed');
    assert.equal(safeNextPath('/\\evil.example'), '/feed');
    assert.equal(safeNextPath(null, '/'), '/');
  });
});

describe('validateUsername', () => {
  it('accepts valid usernames and explains invalid ones', () => {
    assert.equal(validateUsername('jane.doe_92'), null);
    assert.match(validateUsername('jo') ?? '', /at least 3/);
    assert.match(validateUsername('jane doe') ?? '', /letters, numbers/);
  });
});

describe('colors', () => {
  it('derives a darker gradient end and detects light colours', () => {
    assert.equal(shade('#ffffff', 0.5), '#808080');
    assert.match(bannerGradient('#3B82F6'), /linear-gradient\(120deg, #3B82F6 0%, #[0-9a-f]{6} 100%\)/);
    assert.equal(isLightColor('#F59E0B'), true);
    assert.equal(isLightColor('#27272A'), false);
  });
});
