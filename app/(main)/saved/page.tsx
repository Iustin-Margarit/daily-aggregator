import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import type { SavedView } from '@/components/saved/saved-manager';
import { AccountSaved, GuestSaved } from '@/components/saved/saved-pages';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { SavedArticle } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.saved };
}

export default async function SavedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const view: SavedView = {
    folder: params.folder ?? 'all',
    hideRead: params.hide_read === '1',
    q: (params.q ?? '').slice(0, 100),
  };

  // Visitors without an account: their clippings live in this browser.
  if (!user) return <GuestSaved initialView={view} />;

  const supabase = await createClient();
  const [{ data: articles }, { data: folders }] = await Promise.all([
    supabase.rpc('get_saved_articles'),
    supabase.from('saved_folders').select('id, name').order('name'),
  ]);

  const folderList = folders ?? [];
  if (!folderList.some((f) => f.id === view.folder)) view.folder = 'all';

  return (
    <AccountSaved userId={user.id} initialArticles={(articles ?? []) as SavedArticle[]} initialFolders={folderList} initialView={view} />
  );
}
