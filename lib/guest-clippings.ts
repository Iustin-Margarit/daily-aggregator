/*
 * A guest's clippings, kept in this browser (localStorage) until they sign in:
 * the saved stories (a copy of each story, so the Saved page works without the
 * database), their folders and read marks. Every tab sees the same list
 * (the "storage" event). When the reader signs in, components/saved/
 * guest-import.tsx moves everything into the account and clears this store.
 */

import type { FeedArticle, SavedArticle, SavedFolder } from '@/lib/types';

const KEY = 'daily-aggregator:clippings:v1';
/** A browser is not a database: enough for a visitor trying the paper. */
export const MAX_GUEST_CLIPPINGS = 200;
export const MAX_GUEST_FOLDERS = 30;

export type GuestClippings = { articles: SavedArticle[]; folders: SavedFolder[] };

const EMPTY: GuestClippings = { articles: [], folders: [] };
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: GuestClippings = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): GuestClippings {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<GuestClippings>;
    const articles = Array.isArray(value.articles)
      ? value.articles.filter((a): a is SavedArticle => typeof a?.article_id === 'string' && typeof a?.title === 'string' && typeof a?.slug === 'string' && typeof a?.url === 'string' && /^https?:\/\//i.test(a.url))
      : [];
    const folders = Array.isArray(value.folders)
      ? value.folders.filter((f): f is SavedFolder => typeof f?.id === 'string' && typeof f?.name === 'string')
      : [];
    return { articles, folders };
  } catch {
    return EMPTY;
  }
}

/** The current clippings (the same object until they change, as useSyncExternalStore needs). */
export function getGuestClippings(): GuestClippings {
  if (typeof window === 'undefined') return EMPTY;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

export function getServerGuestClippings(): GuestClippings {
  return EMPTY;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeGuestClippings(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Writes the clippings; false when the browser refuses (private mode, storage full). */
function write(next: GuestClippings): boolean {
  try {
    if (next.articles.length === 0 && next.folders.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  emit();
  return true;
}

function update(change: (current: GuestClippings) => GuestClippings): boolean {
  return write(change(getGuestClippings()));
}

export type GuestResult = { error: { message: string; code?: string } | null };
const ok: GuestResult = { error: null };
const storageError: GuestResult = { error: { message: 'STORAGE_BLOCKED' } };


export function isGuestClipped(articleId: string): boolean {
  return getGuestClippings().articles.some((a) => a.article_id === articleId);
}

/** A story from the paper as a clipping. */
export function toClipping(article: FeedArticle): SavedArticle {
  return {
    article_id: article.id,
    title: article.title,
    summary: article.summary,
    url: article.url,
    slug: article.slug,
    image_url: article.image_url,
    published_at: article.published_at,
    reading_minutes: article.reading_minutes ?? null,
    source_id: article.source_id,
    source_name: article.source_name,
    source_enabled: true,
    category_id: article.category_id,
    category_name: article.category_name,
    folder_id: null,
    is_read: false,
    saved_at: new Date().toISOString(),
  };
}

export function addGuestClipping(clipping: SavedArticle): GuestResult {
  const current = getGuestClippings();
  if (current.articles.some((a) => a.article_id === clipping.article_id)) return ok;
  if (current.articles.length >= MAX_GUEST_CLIPPINGS) return { error: { message: 'SAVED_LIMIT_REACHED' } };
  return update((c) => ({ ...c, articles: [...c.articles, clipping] })) ? ok : storageError;
}

export function removeGuestClipping(articleId: string): GuestResult {
  return update((c) => ({ ...c, articles: c.articles.filter((a) => a.article_id !== articleId) })) ? ok : storageError;
}

export function patchGuestClipping(articleId: string, patch: Partial<Pick<SavedArticle, 'is_read' | 'folder_id'>>): GuestResult {
  return update((c) => ({ ...c, articles: c.articles.map((a) => (a.article_id === articleId ? { ...a, ...patch } : a)) })) ? ok : storageError;
}

export function createGuestFolder(name: string): { data: SavedFolder | null } & GuestResult {
  const current = getGuestClippings();
  if (current.folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return { data: null, error: { message: 'duplicate', code: '23505' } };
  if (current.folders.length >= MAX_GUEST_FOLDERS) return { data: null, error: { message: 'FOLDER_LIMIT_REACHED' } };
  const folder = { id: crypto.randomUUID(), name };
  return update((c) => ({ ...c, folders: [...c.folders, folder] })) ? { data: folder, error: null } : { data: null, ...storageError };
}

export function renameGuestFolder(id: string, name: string): { data: SavedFolder | null } & GuestResult {
  const current = getGuestClippings();
  if (current.folders.some((f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase())) return { data: null, error: { message: 'duplicate', code: '23505' } };
  const folder = { id, name };
  return update((c) => ({ ...c, folders: c.folders.map((f) => (f.id === id ? folder : f)) })) ? { data: folder, error: null } : { data: null, ...storageError };
}

export function deleteGuestFolder(id: string): GuestResult {
  return update((c) => ({
    folders: c.folders.filter((f) => f.id !== id),
    articles: c.articles.map((a) => (a.folder_id === id ? { ...a, folder_id: null } : a)),
  }))
    ? ok
    : storageError;
}

export function clearGuestClippings() {
  write(EMPTY);
}

/**
 * Keeps only these clippings (and the folders they are in), so the ones that
 * could not be moved into the account stay in this browser for the next try.
 */
export function keepOnlyGuestClippings(articleIds: Set<string>) {
  update((c) => {
    const articles = c.articles.filter((a) => articleIds.has(a.article_id));
    const folderIds = new Set(articles.map((a) => a.folder_id).filter(Boolean));
    return { articles, folders: c.folders.filter((f) => folderIds.has(f.id)) };
  });
}
