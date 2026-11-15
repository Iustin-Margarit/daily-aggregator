'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { clearGuestClippings, getGuestClippings, keepOnlyGuestClippings } from '@/lib/guest-clippings';
import { useI18n } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';

/**
 * After a visitor signs in (or signs up), the clippings they kept in this
 * browser move into their account: folders (matched by name), stories, notes
 * and read marks. Stories already saved in the account keep the account's
 * copy; stories that have since left the paper are skipped. Clippings that could
 * not be moved (no connection, a full account) stay in this browser and are
 * tried again on the next visit. Renders nothing.
 */
export function GuestImport({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const started = useRef(false);
  const { t, plural } = useI18n();

  useEffect(() => {
    if (started.current) return;
    const { articles, folders } = getGuestClippings();
    if (articles.length === 0 && folders.length === 0) return;
    started.current = true;

    void (async () => {
      const supabase = createClient();

      // Folders: reuse the account's folder of the same name, create the rest. If the account cannot
      // be reached, nothing is moved: everything stays in this browser for the next visit.
      const folderIds = new Map<string, string>();
      const { data: existing, error: foldersError } = await supabase.from('saved_folders').select('id, name');
      if (foldersError) {
        started.current = false;
        return;
      }
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
        notes: a.notes,
        saved_at: a.saved_at,
      }));
      let moved = 0;
      // Clippings that could not be moved for a passing reason (no connection, a full account) stay here.
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
      if (moved > 0) {
        showToast({
          type: 'success',
          title: plural(t.saved.imported, moved),
          message: t.saved.importedNote,
          action: { label: t.common.openSaved, onClick: () => router.push('/saved') },
        });
        router.refresh();
      }
    })();
  }, [userId, showToast, router, t, plural]);

  return null;
}
