import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SavedManager, type SavedView } from '@/components/saved/saved-manager';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { SavedArticle } from '@/lib/types';

export const metadata: Metadata = { title: 'Saved stories' };

export default async function SavedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect('/login?next=/saved');

  const supabase = await createClient();
  const [{ data: articles }, { data: folders }] = await Promise.all([
    supabase.rpc('get_saved_articles'),
    supabase.from('saved_folders').select('id, name').order('name'),
  ]);

  const folderList = folders ?? [];
  const view: SavedView = {
    folder: folderList.some((f) => f.id === params.folder) ? (params.folder as string) : 'all',
    hideRead: params.hide_read === '1',
    q: (params.q ?? '').slice(0, 100),
  };

  return (
    <SavedManager userId={user.id} initialArticles={(articles ?? []) as SavedArticle[]} initialFolders={folderList} initialView={view} />
  );
}
