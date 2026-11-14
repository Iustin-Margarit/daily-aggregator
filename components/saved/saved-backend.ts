import {
  addGuestClipping,
  createGuestFolder,
  deleteGuestFolder,
  patchGuestClipping,
  removeGuestClipping,
  renameGuestFolder,
} from '@/lib/guest-clippings';
import { createClient } from '@/lib/supabase/client';
import type { SavedArticle, SavedFolder } from '@/lib/types';

type Failure = { message: string; code?: string } | null;
type Result = Promise<{ error: Failure }>;
type FolderResult = Promise<{ data: SavedFolder | null; error: Failure }>;

/**
 * Where the Saved page keeps its clippings: the reader's account (Supabase) or,
 * for a visitor without one, this browser (lib/guest-clippings.ts). The Saved
 * page works the same with either.
 */
export type SavedBackend = {
  kind: 'account' | 'browser';
  setRead: (articleId: string, isRead: boolean) => Result;
  setFolder: (articleId: string, folderId: string | null) => Result;
  setNote: (articleId: string, note: string | null) => Result;
  remove: (articleId: string) => Result;
  restore: (article: SavedArticle) => Result;
  createFolder: (name: string) => FolderResult;
  renameFolder: (id: string, name: string) => FolderResult;
  deleteFolder: (id: string) => Result;
};

export function accountBackend(userId: string): SavedBackend {
  const supabase = createClient();
  const row = (articleId: string) => ({ user_id: userId, article_id: articleId });
  const updateRow = async (articleId: string, patch: { is_read?: boolean; folder_id?: string | null; notes?: string | null }) =>
    supabase.from('saved_articles').update(patch).match(row(articleId));
  return {
    kind: 'account',
    setRead: (articleId, isRead) => updateRow(articleId, { is_read: isRead }),
    setFolder: (articleId, folderId) => updateRow(articleId, { folder_id: folderId }),
    setNote: (articleId, note) => updateRow(articleId, { notes: note }),
    remove: async (articleId) => supabase.from('saved_articles').delete().match(row(articleId)),
    restore: async (a) =>
      supabase.from('saved_articles').insert({ ...row(a.article_id), folder_id: a.folder_id, is_read: a.is_read, notes: a.notes, saved_at: a.saved_at }),
    createFolder: async (name) => supabase.from('saved_folders').insert({ name, user_id: userId }).select('id, name').single(),
    renameFolder: async (id, name) => supabase.from('saved_folders').update({ name }).eq('id', id).select('id, name').single(),
    deleteFolder: async (id) => supabase.from('saved_folders').delete().eq('id', id),
  };
}

export function browserBackend(): SavedBackend {
  return {
    kind: 'browser',
    setRead: async (articleId, isRead) => patchGuestClipping(articleId, { is_read: isRead }),
    setFolder: async (articleId, folderId) => patchGuestClipping(articleId, { folder_id: folderId }),
    setNote: async (articleId, note) => patchGuestClipping(articleId, { notes: note }),
    remove: async (articleId) => removeGuestClipping(articleId),
    restore: async (article) => addGuestClipping(article),
    createFolder: async (name) => createGuestFolder(name),
    renameFolder: async (id, name) => renameGuestFolder(id, name),
    deleteFolder: async (id) => deleteGuestFolder(id),
  };
}
