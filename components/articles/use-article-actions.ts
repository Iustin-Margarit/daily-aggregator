'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { articleShareUrl, shareLink } from '@/components/articles/share';
import { useToast } from '@/components/ui/toast';
import { addGuestClipping, isGuestClipped, removeGuestClipping, subscribeGuestClippings, toClipping } from '@/lib/guest-clippings';
import { createClient } from '@/lib/supabase/client';
import type { FeedArticle } from '@/lib/types';

/**
 * Save (clip) / share with optimistic updates and friendly errors. Readers
 * without an account clip into this browser (lib/guest-clippings.ts); signing
 * in moves those clippings into the account.
 */
export function useArticleActions(article: FeedArticle, userId: string | null) {
  const router = useRouter();
  const { showToast } = useToast();

  const [saved, setSaved] = useState(article.is_saved);
  const [busy, setBusy] = useState(false);

  // When the page hands over a different story (or fresh data), start again from it.
  const [shown, setShown] = useState({ id: article.id, isSaved: article.is_saved });
  if (shown.id !== article.id || shown.isSaved !== article.is_saved) {
    setShown({ id: article.id, isSaved: article.is_saved });
    setSaved(article.is_saved);
  }

  const guestSaved = useSyncExternalStore(
    subscribeGuestClippings,
    () => isGuestClipped(article.id),
    () => false,
  );

  /** A guest's clip: kept in this browser, with a word about accounts. */
  const toggleGuestClip = () => {
    if (guestSaved) {
      const { error } = removeGuestClipping(article.id);
      if (error) {
        showToast({ type: 'error', title: 'Could not remove the story', message: error.message });
        return;
      }
      showToast({
        type: 'success',
        title: 'Removed from your saved stories',
        action: { label: 'Undo', onClick: () => void addGuestClipping(toClipping(article)) },
      });
      return;
    }
    const { error } = addGuestClipping(toClipping(article));
    if (error) {
      const full = error.message === 'SAVED_LIMIT_REACHED';
      showToast({
        type: 'error',
        title: full ? 'This browser holds 200 saved stories' : 'Could not save the story',
        message: full ? 'Remove a few, or create a free account to keep up to 1000.' : error.message,
      });
      return;
    }
    showToast({
      type: 'success',
      title: 'Saved, in this browser',
      message: 'A free account keeps your saved stories on every device.',
      action: { label: 'Open saved stories', onClick: () => router.push('/saved') },
    });
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
    if (!userId) {
      toggleGuestClip();
      return;
    }
    if (busy) return;
    setBusy(true);

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

    setBusy(false);
  };

  const share = async () => {
    const result = await shareLink(article.title, articleShareUrl(article.slug));
    if (result === 'copied') showToast({ type: 'success', title: 'Link copied to clipboard' });
    if (result === 'failed') showToast({ type: 'error', title: 'Could not share this article' });
  };

  return { saved: userId ? saved : guestSaved, busy, toggleSave, share };
}
