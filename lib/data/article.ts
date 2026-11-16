import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { mutedArgs } from '@/lib/feed';
import { guestMutesFrom } from '@/lib/guest';
import { createClient, getSessionUser } from '@/lib/supabase/server';
import type { ArticleDetail, RelatedArticle } from '@/lib/types';

/**
 * One story by its slug (or id), once per request: the sheet, the story's address and its
 * metadata share it. A database outage throws ("Stop the presses", app/error.tsx)
 * rather than pretending the story does not exist.
 */
export const getArticle = cache(async (slugOrId: string): Promise<ArticleDetail | null> => {
  const supabase = await createClient();
  let key = slugOrId;
  try {
    key = decodeURIComponent(slugOrId);
  } catch {
    // A broken address: look it up as it is (it will not be found).
  }
  const { data, error } = await supabase.rpc('get_article', { p_slug_or_id: key }).maybeSingle();
  if (error) throw new Error(`Could not load the story: ${error.message}`);
  return (data as ArticleDetail | null) ?? null;
});

/**
 * "More from the desk" at the foot of the sheet: a few newer stories from the same section. It leaves out
 * what the front page leaves out: an account's lists are in the database, a visitor's muted newspapers and
 * words in their cookies (Settings). A failure only drops the list.
 */
export async function getMoreFromDesk(articleId: string, limit = 3): Promise<RelatedArticle[]> {
  const [supabase, user, jar] = await Promise.all([createClient(), getSessionUser(), cookies()]);
  const guestMutes = user ? undefined : guestMutesFrom((name) => jar.get(name)?.value);
  const { data, error } = await supabase.rpc('get_related_articles', { p_article_id: articleId, p_limit: limit, ...mutedArgs(guestMutes) });
  if (error) console.error('[story] could not load more from the desk:', error.message);
  return (data ?? []) as RelatedArticle[];
}
