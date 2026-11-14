import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { FeedView } from '@/components/feed/feed-view';
import { feedRpcArgs, filtersFromSearchParams, pageFromSearchParams } from '@/lib/feed';
import { GUEST_SECTIONS_COOKIE, parseGuestSections } from '@/lib/guest';
import { canIngest, refreshNewsIfStale } from '@/lib/ingestion/auto-refresh';
import { getOnThisDay } from '@/lib/on-this-day';
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
  const [user, profile, jar] = await Promise.all([getCurrentUser(), getCurrentProfile(), cookies()]);
  // Visitors read the paper too, with the sections they chose in this browser (lib/guest.ts).
  const signedIn = Boolean(user && profile);
  if (signedIn && !profile?.has_completed_onboarding) redirect('/onboarding');

  const supabase = await createClient();
  const [{ data: categories }, { data: sources }, { data: preferences }, params] = await Promise.all([
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    supabase.from('sources').select('id, name, category_id').eq('is_enabled', true).order('name'),
    user && signedIn
      ? supabase.from('user_preferred_categories').select('category_id').eq('user_id', user.id)
      : Promise.resolve({ data: parseGuestSections(jar.get(GUEST_SECTIONS_COOKIE)?.value).map((category_id) => ({ category_id })) }),
    searchParams,
  ]);

  const categoryList: Category[] = categories ?? [];
  // Only sections that still exist (a guest's cookie may be old).
  const preferredCategoryIds = (preferences ?? []).map((p) => p.category_id).filter((id) => categoryList.some((c) => c.id === id));
  const filters = filtersFromSearchParams(params, categoryList, preferredCategoryIds);
  const page = pageFromSearchParams(params);
  const asOf = new Date().toISOString();

  const [{ data: articles, error: feedError }, onThisDay] = await Promise.all([supabase.rpc('get_feed', feedRpcArgs(filters, page, asOf)), getOnThisDay()]);
  const initialArticles = (articles ?? []) as FeedArticle[];

  // Brand-new install: the database has no articles yet, so fetch them now.
  let databaseEmpty = false;
  if (feedError) console.error('[feed] could not load the stories:', feedError.message);
  if (!feedError && initialArticles.length === 0 && page === 1) {
    const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true });
    databaseEmpty = !count;
  }
  const autoIngest = canIngest();
  after(() => refreshNewsIfStale({ force: databaseEmpty && autoIngest }));

  return (
    <FeedView
      userId={signedIn && user ? user.id : null}
      username={signedIn && profile ? profile.username : null}
      categories={categoryList}
      sources={(sources ?? []) as SourceOption[]}
      preferredCategoryIds={preferredCategoryIds}
      initialFilters={filters}
      initialPage={page}
      initialArticles={initialArticles}
      initialAsOf={asOf}
      initialError={Boolean(feedError)}
      onThisDay={onThisDay}
      waitingForFirstIngest={databaseEmpty && autoIngest}
      databaseEmptyWithoutIngestion={databaseEmpty && !autoIngest}
    />
  );
}
