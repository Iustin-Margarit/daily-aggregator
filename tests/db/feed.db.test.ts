/*
 * Checks the feed functions against a real database, as a visitor (anon) would
 * call them: `npm run test:db`. Uses the project in .env.local (the dev
 * project); it only reads, and refuses to run against production.
 */
import '../../scripts/load-env';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

const PRODUCTION_REF = 'zjxzzecffppaffrdhmds';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are needed (.env.local).');
if (url.includes(PRODUCTION_REF)) throw new Error('test:db runs against the dev project only.');

const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

type FeedRow = Database['public']['Functions']['get_feed']['Returns'][number];

describe('get_feed for a visitor', () => {
  let page: FeedRow[] = [];

  before(async () => {
    const { data, error } = await anon.rpc('get_feed', { p_limit: 30 });
    assert.equal(error, null, error?.message);
    page = data ?? [];
    assert.ok(page.length > 5, 'the dev project needs stories (npm run ingest)');
  });

  it('prints the newest stories first with a total, and nothing saved', () => {
    const dates = page.map((row) => row.published_at);
    assert.deepEqual(dates, [...dates].sort().reverse());
    assert.ok(page[0].total_count >= page.length);
    assert.ok(page.every((row) => row.is_saved === false));
  });

  it('turns pages without repeating stories', async () => {
    const first = page.slice(0, 10).map((row) => row.id);
    const { data, error } = await anon.rpc('get_feed', { p_limit: 10, p_offset: 10, p_as_of: page[0].published_at });
    assert.equal(error, null, error?.message);
    assert.ok((data ?? []).every((row) => !first.includes(row.id)));
  });

  it('leaves out a muted paper', async () => {
    const muted = page[0].source_id;
    const { data, error } = await anon.rpc('get_feed', { p_limit: 30, p_muted_source_ids: [muted] });
    assert.equal(error, null, error?.message);
    assert.ok((data ?? []).length > 0);
    assert.ok((data ?? []).every((row) => row.source_id !== muted));
  });

  it('leaves out stories with a muted word', async () => {
    const word = page[0].title.split(/\s+/).find((w) => /^\p{L}{5,}$/u.test(w))?.toLowerCase();
    assert.ok(word, 'a word to mute from the first headline');
    const { data, error } = await anon.rpc('get_feed', { p_limit: 30, p_muted_words: [word] });
    assert.equal(error, null, error?.message);
    assert.ok(!(data ?? []).some((row) => row.id === page[0].id));
  });

  it('keeps to the chosen sections', async () => {
    const section = page[0].category_id;
    const { data, error } = await anon.rpc('get_feed', { p_limit: 30, p_category_ids: [section] });
    assert.equal(error, null, error?.message);
    assert.ok((data ?? []).every((row) => row.category_id === section));
  });
});

describe('get_related_articles for a visitor', () => {
  it('offers other stories from the same desk and honours mutes', async () => {
    const { data: feed } = await anon.rpc('get_feed', { p_limit: 1 });
    const story = feed?.[0];
    assert.ok(story);
    const { data, error } = await anon.rpc('get_related_articles', { p_article_id: story.id, p_limit: 6 });
    assert.equal(error, null, error?.message);
    const related = data ?? [];
    assert.ok(related.every((row) => row.id !== story.id && row.category_name === story.category_name));
    if (related.length > 0) {
      const paper = related[0].source_name;
      const { data: sources } = await anon.from('sources').select('id, name').eq('name', paper);
      const { data: muted, error: mutedError } = await anon.rpc('get_related_articles', {
        p_article_id: story.id,
        p_limit: 6,
        p_muted_source_ids: (sources ?? []).map((s) => s.id),
      });
      assert.equal(mutedError, null, mutedError?.message);
      assert.ok((muted ?? []).every((row) => row.source_name !== paper));
    }
  });
});

describe('get_also_reported for a visitor', () => {
  it('gives the same news from other papers, one story each, and honours mutes', async () => {
    // A recent story that other papers also reported (the dev project has dozens).
    const { data: feed } = await anon.rpc('get_feed', { p_limit: 60 });
    let story: { id: string; source_name: string } | undefined;
    let others: { id: string; source_name: string }[] = [];
    for (const row of feed ?? []) {
      const { data, error } = await anon.rpc('get_also_reported', { p_article_id: row.id });
      assert.equal(error, null, error?.message);
      if (data?.length) {
        story = row;
        others = data;
        break;
      }
    }
    assert.ok(story, 'no story among the newest 60 is reported by another paper');
    assert.ok(others.every((row) => row.id !== story.id && row.source_name !== story.source_name), 'only other papers');
    assert.equal(new Set(others.map((row) => row.source_name)).size, others.length, 'one story per paper');
    const paper = others[0].source_name;
    const { data: sources } = await anon.from('sources').select('id, name').eq('name', paper);
    const { data: muted, error } = await anon.rpc('get_also_reported', { p_article_id: story.id, p_muted_source_ids: (sources ?? []).map((s) => s.id) });
    assert.equal(error, null, error?.message);
    assert.ok((muted ?? []).every((row) => row.source_name !== paper), 'a muted paper is left out');
  });

  it('is empty for a story nobody else reported, or an unknown one', async () => {
    const { data, error } = await anon.rpc('get_also_reported', { p_article_id: '00000000-0000-0000-0000-000000000000' });
    assert.equal(error, null, error?.message);
    assert.deepEqual(data, []);
  });
});

describe('get_front_page for a visitor', () => {
  type FrontRow = Database['public']['Functions']['get_front_page']['Returns'][number];
  let rows: FrontRow[] = [];

  before(async () => {
    const { data, error } = await anon.rpc('get_front_page', { p_per_section: 5, p_latest: 10 });
    assert.equal(error, null, error?.message);
    rows = data ?? [];
    assert.ok(rows.length > 10, 'the dev project needs stories (npm run ingest)');
  });

  it('gives each section its newest stories, numbered from 1, and each story once', () => {
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
    const bySection = new Map<string, FrontRow[]>();
    for (const row of rows.filter((r) => r.section_rank !== null)) bySection.set(row.category_id, [...(bySection.get(row.category_id) ?? []), row]);
    assert.ok(bySection.size >= 3, 'stories from several sections');
    for (const list of bySection.values()) {
      const ranks = list.map((r) => r.section_rank).sort((a, b) => (a ?? 0) - (b ?? 0));
      assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
      assert.ok(list.length <= 5);
      const byRank = [...list].sort((a, b) => (a.section_rank ?? 0) - (b.section_rank ?? 0)).map((r) => r.published_at);
      assert.deepEqual(byRank, [...byRank].sort().reverse());
    }
  });

  it('numbers the newest stories 1-10 across the paper', () => {
    const latest = rows.filter((r) => r.latest_rank !== null).sort((a, b) => (a.latest_rank ?? 0) - (b.latest_rank ?? 0));
    assert.deepEqual(latest.map((r) => r.latest_rank), Array.from({ length: 10 }, (_, i) => i + 1));
    const dates = latest.map((r) => r.published_at);
    assert.deepEqual(dates, [...dates].sort().reverse());
    assert.ok(rows.every((r) => r.is_saved === false));
  });

  it('keeps the newest to the chosen sections, but still prints every section', async () => {
    const section = rows[0].category_id;
    const { data, error } = await anon.rpc('get_front_page', { p_category_ids: [section], p_per_section: 3, p_latest: 10 });
    assert.equal(error, null, error?.message);
    const list = data ?? [];
    assert.ok(list.filter((r) => r.latest_rank !== null).every((r) => r.category_id === section));
    assert.ok(new Set(list.filter((r) => r.section_rank !== null).map((r) => r.category_id)).size > 1);
  });

  it('honours a visitor’s muted paper and words', async () => {
    const muted = rows[0].source_id;
    const word = rows[0].title.split(/\s+/).find((w) => /^\p{L}{5,}$/u.test(w))?.toLowerCase();
    const { data, error } = await anon.rpc('get_front_page', { p_muted_source_ids: [muted], p_muted_words: word ? [word] : [] });
    assert.equal(error, null, error?.message);
    assert.ok((data ?? []).length > 0);
    assert.ok((data ?? []).every((r) => r.source_id !== muted && r.id !== rows[0].id));
  });

  it('keeps its limits', async () => {
    const { data, error } = await anon.rpc('get_front_page', { p_per_section: 500, p_latest: 500 });
    assert.equal(error, null, error?.message);
    const sections = new Set((data ?? []).map((r) => r.category_id)).size;
    assert.ok((data ?? []).length <= sections * 12 + 30);
  });
});

describe('what a visitor cannot see or do', () => {
  it('cannot read feed addresses or fetch diagnostics', async () => {
    for (const column of ['rss_url', 'last_error', 'etag', 'last_modified']) {
      const { error } = await anon.from('sources').select(column).limit(1);
      assert.ok(error, `sources.${column} must be hidden from visitors`);
    }
  });

  it('cannot call the admin and ingestion functions', async () => {
    assert.ok((await anon.rpc('admin_list_sources')).error);
    assert.ok((await anon.rpc('database_size_bytes')).error, 'the database size is for the server only');
    assert.ok((await anon.rpc('join_story_group', { p_article_id: '00000000-0000-0000-0000-000000000000' })).error, 'grouping stories is for ingestion only');
    assert.ok((await anon.rpc('ingest_articles', { p_source_id: '00000000-0000-0000-0000-000000000000', p_articles: [] })).error);
  });
});
