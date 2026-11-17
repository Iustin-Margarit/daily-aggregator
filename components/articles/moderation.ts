import { setSourceMuted } from '@/lib/hidden-stories';
import { createClient } from '@/lib/supabase/client';

// Small wrappers so the quick-read sheet and Settings share logic.

export async function hideArticle(userId: string, articleId: string) {
  return createClient().from('hidden_articles').upsert({ user_id: userId, article_id: articleId });
}

export async function unhideArticle(userId: string, articleId: string) {
  return createClient().from('hidden_articles').delete().eq('user_id', userId).eq('article_id', articleId);
}

// Muting and unmuting also tell this tab, so the sheet's More menu shows the paper's state wherever it was changed.
export async function muteSource(userId: string, sourceId: string) {
  const result = await createClient().from('muted_sources').upsert({ user_id: userId, source_id: sourceId });
  if (!result.error) setSourceMuted(sourceId, true);
  return result;
}

export async function unmuteSource(userId: string, sourceId: string) {
  const result = await createClient().from('muted_sources').delete().eq('user_id', userId).eq('source_id', sourceId);
  if (!result.error) setSourceMuted(sourceId, false);
  return result;
}
