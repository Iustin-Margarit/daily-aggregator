import { GUEST_MAX_HIDDEN, guestMutesFrom, noGuestMutes, parseGuestHidden, parseGuestSections } from '../lib/guest';
import { toClipping } from '../lib/guest-clippings';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLightColor, shade } from '../lib/colors';
import { FEED_PAGE_SIZE, FIRST_PAGE_SIZE, feedRpcArgs, gridGaps, pageCount, pageFromSearchParams, pageHref, paperSlugsFromParams, queryWithout, searchFromParams, sectionFromSlug, visiblePages } from '../lib/feed';
import { buildFrontPage, DIGEST_LINES, type FrontRow } from '../lib/front-page';
import { isPaperPath, loginPath, paperPath, paperSlug, searchPath, sectionPath, sectionSlug, storyPath } from '../lib/routes';
import { recallStory, rememberStory } from '../lib/story-cache';
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

  it('cleanText drops unfilled template and tracking placeholders, not real text in braces', () => {
    assert.equal(cleanText('Presented by Bitget. {beacon} Business & markets'), 'Presented by Bitget. Business & markets');
    assert.equal(cleanText('A {{ pixel }} B %%open_tracker%% C {utm.source}'), 'A B C');
    assert.equal(cleanText('&lt;p&gt;{beacon}&lt;/p&gt; News'), 'News');
    assert.equal(cleanText('Set {x, y} and {see below}'), 'Set {x, y} and {see below}');
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

describe('lists of stories', () => {
  const asOf = '2026-11-12T12:00:00.000Z';
  const categories = [
    { id: 'c1', name: 'Technology', sort_order: 1 },
    { id: 'c2', name: 'Science', sort_order: 2 },
    { id: 'c3', name: 'Sports', sort_order: 3 },
  ];

  it('pages a list: 16 on the first page with a lead, then 15; a search 15 from the start', () => {
    const list = { categoryIds: ['c1'], search: '' };
    assert.equal(feedRpcArgs(list, 1, asOf).p_limit, FIRST_PAGE_SIZE);
    assert.equal(feedRpcArgs(list, 2, asOf).p_offset, FIRST_PAGE_SIZE);
    assert.equal(feedRpcArgs(list, 3, asOf).p_offset, FIRST_PAGE_SIZE + FEED_PAGE_SIZE);
    assert.equal(feedRpcArgs(list, 3, asOf).p_limit, FEED_PAGE_SIZE);
    assert.deepEqual(feedRpcArgs(list, 1, asOf).p_category_ids, ['c1']);
    const search = { categoryIds: [], search: 'storm' };
    assert.equal(feedRpcArgs(search, 1, asOf).p_limit, FEED_PAGE_SIZE);
    assert.equal(feedRpcArgs(search, 3, asOf).p_offset, 2 * FEED_PAGE_SIZE);
    assert.equal(feedRpcArgs(search, 1, asOf).p_category_ids, undefined);
    assert.equal(feedRpcArgs(search, 1, asOf).p_search, 'storm');
    assert.equal(pageCount(0, true), 1);
    assert.equal(pageCount(FIRST_PAGE_SIZE, true), 1);
    assert.equal(pageCount(FIRST_PAGE_SIZE + 1, true), 2);
    assert.equal(pageCount(FIRST_PAGE_SIZE + FEED_PAGE_SIZE + 1, true), 3);
    assert.equal(pageCount(FEED_PAGE_SIZE, false), 1);
    assert.equal(pageCount(FEED_PAGE_SIZE + 1, false), 2);
  });

  it('reads the page and the search from the address', () => {
    assert.equal(pageFromSearchParams({}), 1);
    assert.equal(pageFromSearchParams({ page: '3' }), 3);
    assert.equal(pageFromSearchParams({ page: '-2' }), 1);
    assert.equal(pageFromSearchParams({ page: 'abc' }), 1);
    assert.equal(searchFromParams({ q: '  storm  ' }), 'storm');
    assert.equal(searchFromParams({ q: ['one', 'two'] }), 'one');
    assert.equal(searchFromParams({ q: 'x'.repeat(150) }).length, 100);
    assert.equal(searchFromParams({}), '');
  });

  it('writes the address of each page of a list', () => {
    assert.equal(pageHref('/latest', {}, 1), '/latest');
    assert.equal(pageHref('/latest', {}, 4), '/latest?page=4');
    assert.equal(pageHref('/latest', { topics: 'all' }, 2), '/latest?topics=all&page=2');
    assert.equal(pageHref('/search', { q: 'rain & wind' }, 1), '/search?q=rain+%26+wind');
  });

  it('finds a section by the name in its address, safely', () => {
    assert.equal(sectionFromSlug(categories, 'sports')?.id, 'c3');
    assert.equal(sectionFromSlug(categories, 'Sports')?.id, 'c3');
    assert.equal(sectionFromSlug(categories, 'cooking'), undefined);
    assert.equal(sectionFromSlug(categories, '%E0%A4%A'), undefined);
  });

  it('names addresses and keeps the rest of a query', () => {
    assert.equal(sectionSlug(' Science Fiction '), 'science-fiction');
    assert.equal(sectionPath('World'), '/section/world');
    assert.equal(searchPath('rain'), '/search?q=rain');
    assert.equal(searchPath(''), '/search');
    assert.ok(isPaperPath('/') && isPaperPath('/latest') && isPaperPath('/search') && isPaperPath('/section/world'));
    assert.ok(!isPaperPath('/sections') && !isPaperPath('/saved') && !isPaperPath('/settings'));
    assert.equal(queryWithout({ topics: 'world', page: '2', sources: 'a,b', x: undefined }, ['topics']), '?page=2&sources=a,b');
    assert.equal(queryWithout({ q: ['one', 'two'] }, []), '?q=one');
    assert.equal(queryWithout({ topics: 'world' }, ['topics']), '');
  });

  it('names the address of a newspaper and of a story', () => {
    assert.equal(paperSlug('The Guardian - World'), 'the-guardian-world');
    assert.equal(paperSlug('Phys.org'), 'phys-org');
    assert.equal(paperSlug('Le Monde & Café'), 'le-monde-and-cafe');
    assert.equal(paperPath('BBC News - World'), '/paper/bbc-news-world');
    assert.equal(storyPath('a-story-1a2b'), '/article/a-story-1a2b');
    assert.ok(isPaperPath('/paper/wired'));
  });

  it('remembers the stories just pressed for the quick-read sheet', () => {
    const story = { slug: 'über-story', title: 'T' } as Parameters<typeof rememberStory>[0];
    rememberStory(story);
    assert.equal(recallStory('%C3%BCber-story'), story);
    assert.equal(recallStory('missing'), null);
    assert.equal(recallStory('%E0%A4%A'), null);
    for (let i = 0; i < 50; i++) rememberStory({ ...story, slug: 's' + i });
    assert.equal(recallStory('über-story'), null, 'only the last few are kept');
    assert.ok(recallStory('s49'));
  });
});

describe('the front page', () => {
  const categories = [
    { id: 'w', name: 'World', sort_order: 1 },
    { id: 't', name: 'Technology', sort_order: 2 },
    { id: 's', name: 'Sports', sort_order: 3 },
  ];
  let clock = Date.parse('2026-11-16T12:00:00Z');
  const row = (id: string, category: string, rank: { s?: number; l?: number }, image = true): FrontRow => ({
    id,
    title: id,
    summary: null,
    url: 'https://example.com/' + id,
    slug: id,
    image_url: image ? 'https://example.com/' + id + '.jpg' : null,
    author: null,
    published_at: new Date((clock -= 60_000)).toISOString(),
    reading_minutes: null,
    source_id: 'p',
    source_name: 'Paper',
    category_id: category,
    category_name: categories.find((c) => c.id === category)?.name ?? '',
    is_saved: false,
    section_rank: rank.s ?? null,
    latest_rank: rank.l ?? null,
  });

  it('leads with the newest story that has a photograph, then the newest headlines', () => {
    const rows = [row('a', 'w', { s: 1, l: 1 }, false), row('b', 't', { s: 1, l: 2 }), row('c', 'w', { s: 2, l: 3 }), row('d', 's', { s: 1, l: 4 })];
    const front = buildFrontPage(rows, categories, []);
    assert.equal(front.lead?.id, 'b');
    assert.deepEqual(front.dispatches.map((r) => r.id), ['a', 'c', 'd']);
  });

  it('prints each story once, unless a section would otherwise be empty', () => {
    const rows = [row('a', 'w', { s: 1, l: 1 }), row('b', 'w', { s: 2 }), row('c', 'w', { s: 3 }, false), row('d', 's', { s: 1, l: 2 })];
    const front = buildFrontPage(rows, categories, []);
    const world = front.digests.find((d) => d.category.id === 'w');
    assert.equal(world?.photo?.id, 'b');
    assert.deepEqual(world?.lines.map((r) => r.id), ['c']);
    // Sports' only story is in the dispatches: it is repeated rather than the section left out.
    assert.equal(front.digests.find((d) => d.category.id === 's')?.photo?.id, 'd');
    // A section without stories is left out.
    assert.equal(front.digests.some((d) => d.category.id === 't'), false);
  });

  it('puts the reader\'s own sections first, then the rest in the paper\'s order', () => {
    const rows = [row('a', 'w', { s: 1 }), row('b', 't', { s: 1 }), row('c', 's', { s: 1 })];
    assert.deepEqual(buildFrontPage(rows, categories, ['s']).digests.map((d) => d.category.id), ['s', 'w', 't']);
    assert.deepEqual(buildFrontPage(rows, categories, []).digests.map((d) => d.category.id), ['w', 't', 's']);
  });

  it('keeps a digest to one photograph and four lines (five without a photograph)', () => {
    const many = Array.from({ length: 8 }, (_, i) => row('x' + i, 'w', { s: i + 1 }, i === 2));
    const digest = buildFrontPage(many, categories, []).digests[0];
    assert.equal(digest.photo?.id, 'x2');
    assert.equal(digest.lines.length, DIGEST_LINES);
    assert.ok(!digest.lines.some((r) => r.id === 'x2'));
    const plain = Array.from({ length: 8 }, (_, i) => row('y' + i, 'w', { s: i + 1 }, false));
    assert.equal(buildFrontPage(plain, categories, []).digests[0].lines.length, DIGEST_LINES + 1);
  });
});

describe('safeNextPath', () => {
  it('only allows same-site relative paths', () => {
    assert.equal(safeNextPath('/saved?folder=1'), '/saved?folder=1');
    assert.equal(safeNextPath('https://evil.example'), '/');
    assert.equal(safeNextPath('//evil.example'), '/');
    assert.equal(safeNextPath('/\\evil.example'), '/');
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
    assert.equal(isLightColor('#F59E0B'), true);
    assert.equal(isLightColor('#27272A'), false);
  });
});

describe('guest mode', () => {
  it('reads the sections a visitor chose from their cookie', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';
    assert.deepEqual(parseGuestSections(`${a},${b},${a}`), [a, b]);
    assert.deepEqual(parseGuestSections(`${a},not-a-uuid,'; drop table x`), [a]);
    assert.deepEqual(parseGuestSections(undefined), []);
  });

  it('reads the stories a visitor hid, keeping the newest when there are too many', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';
    assert.deepEqual(parseGuestHidden(`${a},junk,${b},${a}`), [a, b]);
    const many = Array.from({ length: GUEST_MAX_HIDDEN + 5 }, (_, i) => `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`);
    const kept = parseGuestHidden(many.join(','));
    assert.equal(kept.length, GUEST_MAX_HIDDEN);
    assert.equal(kept.at(-1), many.at(-1));
    const mutes = guestMutesFrom((name) => (name === 'guest-hidden' ? a : undefined));
    assert.deepEqual(mutes.hiddenIds, [a]);
    assert.equal(noGuestMutes(mutes), false);
    assert.equal(noGuestMutes({ sourceIds: [], words: [], hiddenIds: [] }), true);
    // Sent to the feed only when there are some.
    const asOf = '2026-11-17T08:00:00.000Z';
    assert.deepEqual(feedRpcArgs({ categoryIds: [], search: '' }, 1, asOf, mutes).p_hidden_ids, [a]);
    assert.equal(feedRpcArgs({ categoryIds: [], search: '' }, 1, asOf, { sourceIds: [], words: [], hiddenIds: [] }).p_hidden_ids, undefined);
  });

  it('reads the newspapers a list is filtered to from its address', () => {
    assert.deepEqual(paperSlugsFromParams({ papers: 'al-jazeera,NPR-World,al-jazeera' }), ['al-jazeera', 'npr-world']);
    assert.deepEqual(paperSlugsFromParams({ papers: "bbc-news-world,<script>,a b,'x" }), ['bbc-news-world']);
    assert.deepEqual(paperSlugsFromParams({ papers: ['first', 'second'] }), ['first']);
    assert.deepEqual(paperSlugsFromParams({}), []);
    assert.equal(paperSlugsFromParams({ papers: Array.from({ length: 80 }, (_, i) => `p${i}`).join(',') }).length, 60);
  });

  it('turns a story into a clipping kept in the browser', () => {
    const clip = toClipping({
      id: 'id-1', title: 'T', summary: null, url: 'https://x.test/a', slug: 't', image_url: null, author: null,
      published_at: '2026-11-14T08:00:00.000Z', reading_minutes: 3, source_id: 's', source_name: 'S', category_id: 'c',
      category_name: 'World', is_saved: false,
    });
    assert.equal(clip.article_id, 'id-1');
    assert.equal(clip.reading_minutes, 3);
    assert.equal(clip.folder_id, null);
    assert.equal(clip.is_read, false);
    assert.ok(!Number.isNaN(Date.parse(clip.saved_at)));
  });
});

describe('pagination', () => {
  it('shows the first, the last and two pages either side, with gaps for the rest', () => {
    assert.deepEqual(visiblePages(6, 31), [1, 'gap', 4, 5, 6, 7, 8, 'gap', 31]);
    assert.deepEqual(visiblePages(1, 3), [1, 2, 3]);
    assert.deepEqual(visiblePages(1, 9), [1, 2, 3, 'gap', 9]);
  });

  it('prints a single missing page instead of a gap', () => {
    assert.deepEqual(visiblePages(4, 9), [1, 2, 3, 4, 5, 6, 'gap', 9]);
    assert.deepEqual(visiblePages(5, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('story grid', () => {
  it('ends on full rows for full pages', () => {
    // Front page: 16 stories, 4 beside the lead, 12 in the grid. Other pages: 15.
    assert.deepEqual(gridGaps(FIRST_PAGE_SIZE - 4), { two: 0, three: 0 });
    assert.deepEqual(gridGaps(FEED_PAGE_SIZE), { two: 1, three: 0 });
  });

  it('counts the empty slots on a short last page', () => {
    assert.deepEqual(gridGaps(4), { two: 0, three: 2 });
    assert.deepEqual(gridGaps(8), { two: 0, three: 1 });
    assert.deepEqual(gridGaps(0), { two: 0, three: 0 });
  });
});

describe('log in, and back to the page', () => {
  it('comes back to the page the reader was on', () => {
    assert.equal(loginPath('/section/world'), '/login?next=%2Fsection%2Fworld');
    assert.equal(loginPath('/latest?page=2'), '/login?next=%2Flatest%3Fpage%3D2');
    assert.equal(safeNextPath(decodeURIComponent(loginPath('/settings').split('next=')[1])), '/settings');
  });

  it('needs no ?next= for the front page, and never sends the reader back to the login page', () => {
    assert.equal(loginPath('/'), '/login');
    assert.equal(loginPath(null), '/login');
    assert.equal(loginPath('/login?error=x'), '/login');
  });
});
