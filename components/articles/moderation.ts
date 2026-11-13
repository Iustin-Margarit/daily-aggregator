import { createClient } from '@/lib/supabase/client';

// Small wrappers so cards, the article page and the profile page share logic.

export async function hideArticle(userId: string, articleId: string) {
  return createClient().from('hidden_articles').upsert({ user_id: userId, article_id: articleId });
}

export async function unhideArticle(userId: string, articleId: string) {
  return createClient().from('hidden_articles').delete().eq('user_id', userId).eq('article_id', articleId);
}

export async function muteSource(userId: string, sourceId: string) {
  return createClient().from('muted_sources').upsert({ user_id: userId, source_id: sourceId });
}

export async function unmuteSource(userId: string, sourceId: string) {
  return createClient().from('muted_sources').delete().eq('user_id', userId).eq('source_id', sourceId);
}
