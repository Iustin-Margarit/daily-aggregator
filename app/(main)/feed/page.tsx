import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { FeedView } from '@/components/feed/feed-view';
import { feedRpcArgs, filtersFromSearchParams, pageFromSearchParams } from '@/lib/feed';
import { canIngest, refreshNewsIfStale } from '@/lib/ingestion/auto-refresh';
import { createClient, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import type { Category, FeedArticle, SourceOption } from '@/lib/types';

export const metadata: Metadata = { title: 'Front page' };
// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!user || !profile) redirect('/login?next=/feed');
  if (!profile.has_completed_onboarding) redirect('/onboarding');

  const supabase = await createClient();
  const [{ data: categories }, { data: sources }, { data: preferences }, params] = await Promise.all([
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    supabase.from('sources').select('id, name, category_id').eq('is_enabled', true).order('name'),
    supabase.from('user_preferred_categories').select('category_id').eq('user_id', user.id),
    searchParams,
  ]);

  const categoryList: Category[] = categories ?? [];
  const preferredCategoryIds = (preferences ?? []).map((p) => p.category_id);
  const filters = filtersFromSearchParams(params, categoryList, preferredCategoryIds);
  const page = pageFromSearchParams(params);
  const asOf = new Date().toISOString();

  const { data: articles } = await supabase.rpc('get_feed', feedRpcArgs(filters, page, asOf));
  const initialArticles = (articles ?? []) as FeedArticle[];

  // Brand-new install: the database has no articles yet, so fetch them now.
  let databaseEmpty = false;
  if (initialArticles.length === 0 && page === 1) {
    const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true });
    databaseEmpty = !count;
  }
  const autoIngest = canIngest();
  after(() => refreshNewsIfStale({ force: databaseEmpty && autoIngest }));

  return (
    <FeedView
      userId={user.id}
      username={profile.username}
      categories={categoryList}
      sources={(sources ?? []) as SourceOption[]}
      preferredCategoryIds={preferredCategoryIds}
      initialFilters={filters}
      initialPage={page}
      initialArticles={initialArticles}
      initialAsOf={asOf}
      waitingForFirstIngest={databaseEmpty && autoIngest}
      databaseEmptyWithoutIngestion={databaseEmpty && !autoIngest}
    />
  );
}
