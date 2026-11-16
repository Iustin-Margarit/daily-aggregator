import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { clearGuestClippings, getGuestClippings, keepOnlyGuestClippings } from '@/lib/guest-clippings';

/** `null`: the account could not be reached, so nothing moved and everything stays in this browser. */
export type GuestImportResult = { moved: number; kept: number } | null;

/**
 * Moves the clippings a visitor kept in this browser into their account:
 * folders (matched by name), stories and read marks. Stories already
 * saved in the account keep the account's copy; stories that have since left
 * the paper are dropped. Clippings that could not be moved for a passing
 * reason (no connection, a full account) stay in this browser for the next try.
 */
export async function importGuestClippings(supabase: SupabaseClient<Database>, userId: string): Promise<GuestImportResult> {
  const { articles, folders } = getGuestClippings();
  if (articles.length === 0 && folders.length === 0) return { moved: 0, kept: 0 };

  // Folders: reuse the account's folder of the same name, create the rest.
  const folderIds = new Map<string, string>();
  const { data: existing, error: foldersError } = await supabase.from('saved_folders').select('id, name');
  if (foldersError) return null;
  for (const folder of folders) {
    const match = (existing ?? []).find((f) => f.name.toLowerCase() === folder.name.toLowerCase());
    if (match) {
      folderIds.set(folder.id, match.id);
      continue;
    }
    const { data } = await supabase.from('saved_folders').insert({ user_id: userId, name: folder.name }).select('id').single();
    if (data) folderIds.set(folder.id, data.id);
  }

  const rows = articles.map((a) => ({
    user_id: userId,
    article_id: a.article_id,
    folder_id: a.folder_id ? (folderIds.get(a.folder_id) ?? null) : null,
    is_read: a.is_read,
    saved_at: a.saved_at,
  }));
  let moved = 0;
  const kept = new Set<string>();
  const { error } = await supabase.from('saved_articles').upsert(rows, { onConflict: 'user_id,article_id', ignoreDuplicates: true });
  if (!error) {
    moved = rows.length;
  } else {
    // One by one, so a story that has left the paper does not stop the others.
    for (const row of rows) {
      const { error: rowError } = await supabase.from('saved_articles').upsert(row, { onConflict: 'user_id,article_id', ignoreDuplicates: true });
      if (!rowError) moved++;
      // 23503: the story is no longer in the paper, so there is nothing left to keep.
      else if (rowError.code !== '23503') kept.add(row.article_id);
    }
  }

  if (kept.size === 0) clearGuestClippings();
  else keepOnlyGuestClippings(kept);
  return { moved, kept: kept.size };
}
