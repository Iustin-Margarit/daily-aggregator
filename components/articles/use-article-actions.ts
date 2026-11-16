'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { articleShareUrl, shareLink } from '@/components/articles/share';
import { useToast } from '@/components/ui/toast';
import { addGuestClipping, isGuestClipped, removeGuestClipping, subscribeGuestClippings, toClipping } from '@/lib/guest-clippings';
import { errorText } from '@/lib/error-text';
import { useI18n } from '@/lib/i18n/client';
import { savedState, setSavedState, subscribeSavedState } from '@/lib/saved-state';
import { SAVED_PATH } from '@/lib/routes';
import { createClient } from '@/lib/supabase/client';
import { cleanText } from '@/lib/text';
import type { FeedArticle } from '@/lib/types';

/**
 * Save (clip) / share with optimistic updates and friendly errors. A notice (toast) appears only when it
 * offers something the button cannot: Undo after a removal, or what went wrong. Readers
 * without an account clip into this browser (lib/guest-clippings.ts); signing
 * in moves those clippings into the account.
 */
export function useArticleActions(article: FeedArticle, userId: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { t } = useI18n();
  const s = t.story;

  // The toast's "Open saved stories". From inside the sheet it takes the sheet's place in the history (Back
  // then returns to the page the sheet opened over, not to the sheet); from the page it is an ordinary visit.
  const inSheet = pathname.startsWith('/article/');
  const openSaved = useCallback(() => (inSheet ? router.replace(SAVED_PATH) : router.push(SAVED_PATH)), [inSheet, router]);

  const [busy, setBusy] = useState(false);

  // Shared by every copy of this story on screen (the card, the sheet, the "s" key): lib/saved-state.ts.
  const changed = useSyncExternalStore(
    subscribeSavedState,
    () => savedState(article.id),
    () => undefined,
  );
  const saved = changed ?? article.is_saved;
  const articleId = article.id;
  const setSaved = useCallback((value: boolean) => setSavedState(articleId, value), [articleId]);

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
        showToast({ type: 'error', title: s.removeFailed, message: errorText(error, t) });
        return;
      }
      showToast({
        type: 'success',
        title: s.removed,
        action: { label: t.common.undo, onClick: () => void addGuestClipping(toClipping(article)) },
      });
      return;
    }
    const { error } = addGuestClipping(toClipping(article));
    if (error) {
      const full = error.message === 'SAVED_LIMIT_REACHED';
      showToast({
        type: 'error',
        title: full ? s.guestFull : s.saveFailed,
        message: full ? s.guestFullNote : errorText(error, t),
      });
      return;
    }
    // No notice: the Save button itself shows the story saved (toasts are for Undo and errors only).
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
        title: s.accountFull,
        message: s.accountFullNote,
        action: { label: t.common.openSaved, onClick: () => openSaved() },
      });
      return false;
    }
    showToast({ type: 'error', title: s.saveFailed, message: errorText(error, t) });
    return false;
  }, [userId, article.id, setSaved, showToast, openSaved, s, t]);

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
        showToast({ type: 'error', title: s.removeFailed, message: errorText(error, t) });
      } else {
        showToast({ type: 'success', title: s.removed, action: { label: t.common.undo, onClick: () => void save() } });
      }
    } else {
      // Shown as saved at once (the quill's stamp plays now); put back if the database says no.
      setSaved(true);
      if (!(await save())) setSaved(false);
    }

    setBusy(false);
  };

  /** The share sheet where the device has one, else the clipboard; the Share button shows "Copied" itself. */
  const share = async () => {
    // The headline as printed (feeds bring entities and tags), not as the feed sent it.
    const result = await shareLink(cleanText(article.title), articleShareUrl(article.slug));
    if (result === 'failed') showToast({ type: 'error', title: s.shareFailed });
    return result;
  };

  return { saved: userId ? saved : guestSaved, busy, toggleSave, share };
}
