/*
 * The database as the security boundary, checked against the dev project: `npm run test:db`.
 * It makes two temporary readers (readerNNNNN@example.com, through the admin API with the service key
 * from .env.local) and deletes them at the end. It refuses to run against production.
 *
 * - Every function the API offers is either meant for visitors / readers or refused to them: a new
 *   function nobody granted (2.2.1: new objects start locked) is refused, and one that is not in the
 *   lists below fails this test until someone decides who may call it.
 * - A reader sees and changes only their own rows; cannot make themselves admin; cannot write stories
 *   or newspapers. Visitors cannot write at all.
 * - Deleting an account (the server's service-key call) removes everything it owned.
 */
import '../../scripts/load-env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

const PRODUCTION_REF = 'zjxzzecffppaffrdhmds';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !anonKey || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are needed (.env.local).');
if (url.includes(PRODUCTION_REF)) throw new Error('test:db runs against the dev project only.');

type Client = SupabaseClient<Database>;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anon: Client = createClient<Database>(url, anonKey, options);
const service: Client = createClient<Database>(url, serviceKey, options);
const ZERO = '00000000-0000-0000-0000-000000000000';

/** What visitors and readers may call; everything else must be refused (42501). */
const VISITOR_FUNCTIONS = new Set(['get_feed', 'get_front_page', 'get_article', 'get_related_articles', 'get_also_reported', 'is_admin']);
const READER_FUNCTIONS = new Set([...VISITOR_FUNCTIONS, 'get_saved_articles']);

/** Harmless arguments for each function (zero ids, an unknown email, nothing old enough to clean up). */
const ARGUMENTS: Record<string, Record<string, unknown>> = {
  admin_dashboard_stats: {},
  admin_delete_user: { p_user_id: ZERO },
  admin_list_sources: {},
  admin_list_users: {},
  admin_source_stats: {},
  cleanup_old_articles: { p_retention_days: 3650 },
  database_size_bytes: {},
  delete_user_account: { p_user_id: ZERO },
  get_also_reported: { p_article_id: ZERO },
  get_article: { p_slug_or_id: 'no-such-story' },
  get_feed: { p_limit: 1 },
  get_front_page: {},
  get_related_articles: { p_article_id: ZERO },
  get_saved_articles: {},
  ingest_articles: { p_source_id: ZERO, p_articles: [] },
  is_admin: {},
  is_reserved_username: { p_username: 'admin' },
  join_story_group: { p_article_id: ZERO },
  promote_to_admin: { p_email: 'nobody@example.invalid' },
  slugify: { p_text: 'x' },
  start_ingestion_run: { p_trigger: 'nope', p_min_interval_minutes: 100000 },
};

type Reader = { id: string; client: Client };
const made: string[] = [];

async function makeReader(): Promise<Reader> {
  const email = `reader${Math.floor(10000 + Math.random() * 89999)}@example.com`;
  const password = `T-${crypto.randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null, error?.message);
  made.push(data.user!.id);
  const client = createClient<Database>(url, anonKey, options);
  const signIn = await client.auth.signInWithPassword({ email, password });
  assert.equal(signIn.error, null, signIn.error?.message);
  return { id: data.user!.id, client };
}

/** Every function the API offers (from the service key's view of the schema). */
async function apiFunctions(): Promise<string[]> {
  const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/openapi+json' } });
  assert.ok(response.ok, `the schema listing answered ${response.status}`);
  const schema = (await response.json()) as { paths: Record<string, unknown> };
  return Object.keys(schema.paths).filter((path) => path.startsWith('/rpc/')).map((path) => path.slice(5)).sort();
}

const refused = (error: { code?: string } | null) => error?.code === '42501';

let alice: Reader;
let bob: Reader;
let storyId: string;
let sourceId: string;

before(async () => {
  [alice, bob] = await Promise.all([makeReader(), makeReader()]);
  const { data: story } = await anon.from('articles').select('id, source_id').limit(1).single();
  assert.ok(story, 'the dev project needs stories (npm run ingest)');
  storyId = story.id;
  sourceId = story.source_id;
  // Bob's private things, for Alice to try to see.
  const { data: folder, error } = await bob.client.from('saved_folders').insert({ user_id: bob.id, name: 'Bob only' }).select('id').single();
  assert.equal(error, null, error?.message);
  for (const result of await Promise.all([
    bob.client.from('saved_articles').insert({ user_id: bob.id, article_id: storyId, folder_id: folder!.id }),
    bob.client.from('muted_sources').insert({ user_id: bob.id, source_id: sourceId }),
    bob.client.from('muted_keywords').insert({ user_id: bob.id, keyword: 'zebras' }),
    bob.client.from('hidden_articles').insert({ user_id: bob.id, article_id: storyId }),
  ])) {
    assert.equal(result.error, null, result.error?.message);
  }
});

after(async () => {
  for (const id of made) await service.auth.admin.deleteUser(id).catch(() => {});
});

describe('who may call which function', () => {
  it('knows every function the API offers', async () => {
    const unknown = (await apiFunctions()).filter((name) => !(name in ARGUMENTS));
    assert.deepEqual(unknown, [], `new functions: decide who may call them, then list them in ${'tests/db/security.db.test.ts'}`);
  });

  it('lets visitors call only the paper’s reading functions', async () => {
    for (const name of await apiFunctions()) {
      const { error } = await anon.rpc(name as never, ARGUMENTS[name] as never);
      if (VISITOR_FUNCTIONS.has(name)) assert.ok(!refused(error), `${name} must work for visitors: ${error?.message}`);
      else assert.ok(refused(error), `${name} must be refused to visitors (${error?.code ?? 'it ran'})`);
    }
  });

  it('lets readers call only the reading functions and their own saved stories', async () => {
    for (const name of await apiFunctions()) {
      const { error } = await alice.client.rpc(name as never, ARGUMENTS[name] as never);
      if (READER_FUNCTIONS.has(name)) assert.ok(!refused(error), `${name} must work for readers: ${error?.message}`);
      else assert.ok(refused(error), `${name} must be refused to readers (${error?.code ?? 'it ran'})`);
    }
  });
});

describe('a reader’s rows are their own', () => {
  it('cannot see another reader’s saved stories, folders, mutes or hidden stories', async () => {
    for (const table of ['saved_articles', 'saved_folders', 'muted_sources', 'muted_keywords', 'hidden_articles'] as const) {
      const { data, error } = await alice.client.from(table).select('user_id').eq('user_id', bob.id);
      assert.equal(error, null, `${table}: ${error?.message}`);
      assert.equal(data.length, 0, `${table}: Alice can see Bob’s rows`);
    }
    const { data: saved } = await alice.client.rpc('get_saved_articles');
    assert.ok(!(saved ?? []).some((row) => row.article_id === storyId), 'get_saved_articles shows Bob’s clipping to Alice');
    // Bob sees his own (the rows exist).
    const { data: own } = await bob.client.from('saved_articles').select('article_id').eq('user_id', bob.id);
    assert.equal(own?.length, 1);
  });

  it('cannot change or remove another reader’s rows', async () => {
    const renamed = await alice.client.from('saved_folders').update({ name: 'Taken' }).eq('user_id', bob.id).select('id');
    assert.equal(renamed.data?.length ?? 0, 0, 'Alice renamed Bob’s folder');
    await alice.client.from('muted_keywords').delete().eq('user_id', bob.id);
    const { data } = await service.from('muted_keywords').select('keyword').eq('user_id', bob.id);
    assert.equal(data?.length, 1, 'Alice removed Bob’s muted word');
    const profile = await alice.client.from('profiles').update({ username: 'taken-name' }).eq('id', bob.id).select('id');
    assert.equal(profile.data?.length ?? 0, 0, 'Alice changed Bob’s profile');
  });

  it('cannot write rows in another reader’s name', async () => {
    const { error } = await alice.client.from('muted_keywords').insert({ user_id: bob.id, keyword: 'giraffes' });
    assert.ok(error, 'Alice muted a word for Bob');
  });

  it('cannot make themselves an admin', async () => {
    await alice.client.from('profiles').update({ role: 'admin' }).eq('id', alice.id);
    const { data } = await service.from('profiles').select('role').eq('id', alice.id).single();
    assert.notEqual(data?.role, 'admin');
    const { data: isAdmin } = await alice.client.rpc('is_admin');
    assert.equal(isAdmin, false);
  });

  it('cannot write stories, newspapers or sections', async () => {
    const story = await alice.client.from('articles').insert({ source_id: sourceId, title: 'Fake', url: 'https://example.com/fake', slug: 'fake' });
    assert.ok(story.error, 'a reader inserted a story');
    const paper = await alice.client.from('sources').update({ name: 'Taken' }).eq('id', sourceId).select('id');
    assert.equal(paper.data?.length ?? 0, 0, 'a reader renamed a newspaper');
    const section = await alice.client.from('categories').insert({ name: 'Fake section' });
    assert.ok(section.error, 'a reader added a section');
  });
});

describe('visitors only read', () => {
  it('cannot write anything', async () => {
    const attempts = await Promise.all([
      anon.from('saved_folders').insert({ user_id: ZERO, name: 'x' }),
      anon.from('muted_keywords').insert({ user_id: ZERO, keyword: 'zebras' }),
      anon.from('hidden_articles').insert({ user_id: ZERO, article_id: storyId }),
      anon.from('articles').insert({ source_id: sourceId, title: 'Fake', url: 'https://example.com/fake2', slug: 'fake2' }),
      anon.from('categories').insert({ name: 'Fake section' }),
    ]);
    for (const attempt of attempts) assert.ok(attempt.error, 'a visitor wrote a row');
  });

  it('cannot read readers’ rows or profiles', async () => {
    for (const table of ['saved_articles', 'saved_folders', 'muted_sources', 'muted_keywords', 'hidden_articles', 'profiles'] as const) {
      const { data } = await anon.from(table).select('*').limit(1);
      assert.equal(data?.length ?? 0, 0, `${table}: a visitor can read it`);
    }
  });
});

describe('deleting an account', () => {
  it('removes everything the reader owned', async () => {
    const { error } = await service.rpc('delete_user_account', { p_user_id: bob.id });
    assert.equal(error, null, error?.message);
    for (const table of ['saved_articles', 'saved_folders', 'muted_sources', 'muted_keywords', 'hidden_articles'] as const) {
      const { data } = await service.from(table).select('user_id').eq('user_id', bob.id);
      assert.equal(data?.length, 0, `${table} still has rows of the deleted reader`);
    }
    const { data: profile } = await service.from('profiles').select('id').eq('id', bob.id);
    assert.equal(profile?.length, 0, 'the profile is still there');
    const { data: user } = await service.auth.admin.getUserById(bob.id);
    assert.equal(user.user, null, 'the sign-in account is still there');
    // The story itself stays (it belongs to the paper, not the reader).
    const { data: story } = await anon.from('articles').select('id').eq('id', storyId);
    assert.equal(story?.length, 1);
  });
});
