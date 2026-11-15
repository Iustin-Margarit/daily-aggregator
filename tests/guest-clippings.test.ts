import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SavedArticle } from '../lib/types';

// A browser's localStorage, enough for lib/guest-clippings.ts.
const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
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
