'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { articleShareUrl, shareLink } from '@/components/articles/share';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';

export type ActionableArticle = {
  id: string;
  slug: string;
  title: string;
  like_count: number;
  is_liked: boolean;
  is_saved: boolean;
};

/** Like / save / share with optimistic updates and friendly errors. */
export function useArticleActions(article: ActionableArticle, userId: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const [liked, setLiked] = useState(article.is_liked);
  const [likeCount, setLikeCount] = useState(article.like_count);
  const [saved, setSaved] = useState(article.is_saved);
  const [busy, setBusy] = useState({ like: false, save: false });

  useEffect(() => {
    setLiked(article.is_liked);
    setLikeCount(article.like_count);
    setSaved(article.is_saved);
  }, [article.id, article.is_liked, article.like_count, article.is_saved]);

  const requireLogin = useCallback(
    (what: string) => {
      if (userId) return false;
      showToast({
        type: 'info',
        title: `Log in to ${what}`,
        action: { label: 'Log in', onClick: () => router.push(`/login?next=${encodeURIComponent(pathname)}`) },
      });
      return true;
    },
    [userId, showToast, router, pathname],
  );

  const toggleLike = async () => {
    if (requireLogin('like articles') || busy.like || !userId) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    setBusy((b) => ({ ...b, like: true }));

    const supabase = createClient();
    const { error } = next
      ? await supabase.from('likes').insert({ user_id: userId, article_id: article.id })
      : await supabase.from('likes').delete().eq('user_id', userId).eq('article_id', article.id);

    setBusy((b) => ({ ...b, like: false }));
    if (error && error.code !== '23505') {
      setLiked(!next);
      setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
      showToast({ type: 'error', title: 'Could not update your like', message: error.message });
    }
  };

  const save = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await createClient().from('saved_articles').insert({ user_id: userId, article_id: article.id });
    if (!error || error.code === '23505') {
      setSaved(true);
      return true;
    }
    if (error.message.includes('SAVED_LIMIT_REACHED')) {
      showToast({
        type: 'error',
        title: 'You have saved 1000 stories',
        message: 'Remove a few from your saved stories to make room.',
        action: { label: 'Open saved stories', onClick: () => router.push('/saved') },
      });
      return false;
    }
    showToast({ type: 'error', title: 'Could not save the story', message: error.message });
    return false;
  }, [userId, article.id, showToast, router]);

  const toggleSave = async () => {
    if (requireLogin('save stories') || busy.save || !userId) return;
    setBusy((b) => ({ ...b, save: true }));

    if (saved) {
      setSaved(false);
      const { error } = await createClient()
        .from('saved_articles')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', article.id);
      if (error) {
        setSaved(true);
        showToast({ type: 'error', title: 'Could not remove the story', message: error.message });
      } else {
        showToast({ type: 'success', title: 'Removed from your saved stories', action: { label: 'Undo', onClick: () => void save() } });
      }
    } else if (await save()) {
      showToast({
        type: 'success',
        title: 'Saved for later',
        action: { label: 'Open saved stories', onClick: () => router.push('/saved') },
      });
    }

    setBusy((b) => ({ ...b, save: false }));
  };

  const share = async () => {
    const result = await shareLink(article.title, articleShareUrl(article.slug));
    if (result === 'copied') showToast({ type: 'success', title: 'Link copied to clipboard' });
    if (result === 'failed') showToast({ type: 'error', title: 'Could not share this article' });
  };

  return { liked, likeCount, saved, busy, toggleLike, toggleSave, share };
}
