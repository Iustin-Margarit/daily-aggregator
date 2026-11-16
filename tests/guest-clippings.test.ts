import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SavedArticle } from '../lib/types';

// A browser's localStorage, enough for lib/guest-clippings.ts.
const store = new Map<string, string>();
/** True: the browser refuses to write (private mode, storage full). */
let blocked = false;
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (blocked) throw new Error('QuotaExceededError');
        store.set(key, value);
      },
      removeItem: (key: string) => void store.delete(key),
    },
    addEventListener() {},
    removeEventListener() {},
  },
});

// Loaded after the stand-in above is in place (the module reads window when it is used).
const load = () => import('../lib/guest-clippings');

function clipping(id: string): SavedArticle {
  return {
    article_id: id,
    title: `Story ${id}`,
    summary: null,
    url: `https://news.example.com/${id}`,
    slug: `story-${id}`,
    image_url: null,
    published_at: '2026-11-15T08:00:00Z',
    reading_minutes: null,
    source_id: 'source',
    source_name: 'The Example',
    source_enabled: true,
    category_id: 'category',
    category_name: 'World',
    folder_id: null,
    is_read: false,
    notes: null,
    saved_at: '2026-11-15T09:00:00Z',
  };
}

describe('guest clippings after signing in', () => {
  beforeEach(() => store.clear());

  it('keeps the clippings that could not be moved, with their folders and notes', async () => {
    const { addGuestClipping, createGuestFolder, getGuestClippings, keepOnlyGuestClippings, patchGuestClipping } = await load();
    const keep = createGuestFolder('Keep');
    const drop = createGuestFolder('Drop');
    assert.ok(keep.data && drop.data);
    for (const id of ['a', 'b', 'c']) addGuestClipping(clipping(id));
    patchGuestClipping('a', { folder_id: keep.data.id, notes: 'Read again' });
    patchGuestClipping('b', { folder_id: drop.data.id });

    keepOnlyGuestClippings(new Set(['a', 'c']));

    const left = getGuestClippings();
    assert.deepEqual(left.articles.map((a) => a.article_id), ['a', 'c']);
    assert.equal(left.articles[0].notes, 'Read again');
    assert.deepEqual(left.folders.map((f) => f.name), ['Keep']);
  });

  it('forgets everything when nothing is left to keep', async () => {
    const { addGuestClipping, getGuestClippings, keepOnlyGuestClippings } = await load();
    addGuestClipping(clipping('a'));
    keepOnlyGuestClippings(new Set());
    assert.deepEqual(getGuestClippings(), { articles: [], folders: [] });
    assert.equal(store.size, 0);
  });
});

describe('guest clippings store', () => {
  const KEY = 'daily-aggregator:clippings:v1';
  beforeEach(() => {
    store.clear();
    blocked = false;
  });

  it('clips a story once and stops at the limit', async () => {
    const { addGuestClipping, getGuestClippings, MAX_GUEST_CLIPPINGS } = await load();
    assert.equal(addGuestClipping(clipping('a')).error, null);
    assert.equal(addGuestClipping(clipping('a')).error, null, 'clipping twice is not an error');
    assert.equal(getGuestClippings().articles.length, 1);
    for (let i = 1; i < MAX_GUEST_CLIPPINGS; i++) addGuestClipping(clipping(`n${i}`));
    assert.equal(getGuestClippings().articles.length, MAX_GUEST_CLIPPINGS);
    assert.equal(addGuestClipping(clipping('one-too-many')).error?.message, 'SAVED_LIMIT_REACHED');
  });

  it('keeps folder names unique and stops at the folder limit', async () => {
    const { createGuestFolder, MAX_GUEST_FOLDERS } = await load();
    assert.ok(createGuestFolder('Recipes').data);
    assert.equal(createGuestFolder('recipes').error?.code, '23505');
    for (let i = 1; i < MAX_GUEST_FOLDERS; i++) createGuestFolder(`Folder ${i}`);
    assert.equal(createGuestFolder('One too many').error?.message, 'FOLDER_LIMIT_REACHED');
  });

  it('takes clippings out of a folder that is deleted', async () => {
    const { addGuestClipping, createGuestFolder, deleteGuestFolder, getGuestClippings, patchGuestClipping } = await load();
    const folder = createGuestFolder('Later').data!;
    addGuestClipping(clipping('a'));
    patchGuestClipping('a', { folder_id: folder.id });
    deleteGuestFolder(folder.id);
    assert.deepEqual(getGuestClippings().folders, []);
    assert.equal(getGuestClippings().articles[0].folder_id, null);
  });

  it('reads damaged storage as an empty list or keeps only the valid clippings', async () => {
    const { getGuestClippings } = await load();
    store.set(KEY, '{not json');
    assert.deepEqual(getGuestClippings(), { articles: [], folders: [] });
    store.set(KEY, JSON.stringify({ articles: [clipping('a'), { title: 'no id' }, { ...clipping('b'), url: 'javascript:alert(1)' }, null], folders: 'nope' }));
    const read = getGuestClippings();
    assert.deepEqual(read.articles.map((a) => a.article_id), ['a']);
    assert.deepEqual(read.folders, []);
  });

  it('says so when the browser refuses to store anything', async () => {
    const { addGuestClipping, getGuestClippings } = await load();
    blocked = true;
    assert.equal(addGuestClipping(clipping('a')).error?.message, 'STORAGE_BLOCKED');
    assert.deepEqual(getGuestClippings().articles, []);
  });
});

/** Enough of a Supabase client for lib/guest-import.ts: folders, and saved stories that may fail. */
function fakeAccount(options: { foldersDown?: boolean; existingFolders?: { id: string; name: string }[]; rowError?: (articleId: string) => { code: string } | null }) {
  const savedRows: { article_id: string; folder_id: string | null; notes: string | null }[] = [];
  const createdFolders: string[] = [];
  const client = {
    from(table: string) {
      if (table === 'saved_folders') {
        return {
          select: async () => (options.foldersDown ? { data: null, error: { message: 'offline' } } : { data: options.existingFolders ?? [], error: null }),
          insert: (row: { name: string }) => ({
            select: () => ({
              single: async () => {
                createdFolders.push(row.name);
                return { data: { id: `account-${row.name}` }, error: null };
              },
            }),
          }),
        };
      }
      return {
        upsert: async (rows: typeof savedRows | (typeof savedRows)[number]) => {
          const list = Array.isArray(rows) ? rows : [rows];
          const failing = list.map((row) => options.rowError?.(row.article_id)).find(Boolean);
          if (failing) return { error: failing };
          savedRows.push(...list);
          return { error: null };
        },
      };
    },
  };
  return { client: client as never, savedRows, createdFolders };
}

describe('guest import into the account', () => {
  beforeEach(() => {
    store.clear();
    blocked = false;
  });

  it('moves stories with their folders (matched by name) and notes, then forgets them', async () => {
    const { addGuestClipping, createGuestFolder, getGuestClippings, patchGuestClipping } = await load();
    const { importGuestClippings } = await import('../lib/guest-import');
    const recipes = createGuestFolder('Recipes').data!;
    const travel = createGuestFolder('Travel').data!;
    addGuestClipping(clipping('a'));
    addGuestClipping(clipping('b'));
    patchGuestClipping('a', { folder_id: recipes.id, notes: 'Try on Sunday' });
    patchGuestClipping('b', { folder_id: travel.id });
    const account = fakeAccount({ existingFolders: [{ id: 'account-recipes', name: 'recipes' }] });

    assert.deepEqual(await importGuestClippings(account.client, 'user'), { moved: 2, kept: 0 });
    assert.deepEqual(account.createdFolders, ['Travel']);
    assert.deepEqual(
      account.savedRows.map((row) => [row.article_id, row.folder_id, row.notes]),
      [
        ['a', 'account-recipes', 'Try on Sunday'],
        ['b', 'account-Travel', null],
      ],
    );
    assert.deepEqual(getGuestClippings(), { articles: [], folders: [] });
  });

  it('keeps everything in the browser when the account cannot be reached', async () => {
    const { addGuestClipping, getGuestClippings } = await load();
    const { importGuestClippings } = await import('../lib/guest-import');
    addGuestClipping(clipping('a'));
    assert.equal(await importGuestClippings(fakeAccount({ foldersDown: true }).client, 'user'), null);
    assert.equal(getGuestClippings().articles.length, 1);
  });

  it('drops stories that left the paper and keeps the ones that failed for a passing reason', async () => {
    const { addGuestClipping, getGuestClippings } = await load();
    const { importGuestClippings } = await import('../lib/guest-import');
    for (const id of ['gone', 'flaky', 'fine']) addGuestClipping(clipping(id));
    const account = fakeAccount({ rowError: (id) => (id === 'gone' ? { code: '23503' } : id === 'flaky' ? { code: '08006' } : null) });

    assert.deepEqual(await importGuestClippings(account.client, 'user'), { moved: 1, kept: 1 });
    assert.deepEqual(account.savedRows.map((row) => row.article_id), ['fine']);
    assert.deepEqual(getGuestClippings().articles.map((a) => a.article_id), ['flaky']);
  });
});
