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

describe('what a visitor cannot see or do', () => {
  it('cannot read feed addresses or fetch diagnostics', async () => {
    for (const column of ['rss_url', 'last_error', 'etag', 'last_modified']) {
      const { error } = await anon.from('sources').select(column).limit(1);
      assert.ok(error, `sources.${column} must be hidden from visitors`);
    }
  });

  it('cannot call the admin and ingestion functions', async () => {
    assert.ok((await anon.rpc('admin_list_sources')).error);
    assert.ok((await anon.rpc('ingest_articles', { p_source_id: '00000000-0000-0000-0000-000000000000', p_articles: [] })).error);
  });
});
