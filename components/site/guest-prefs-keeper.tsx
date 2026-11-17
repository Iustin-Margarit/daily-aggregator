'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adoptGuestPreferences } from '@/app/actions/profile';
import { useToast } from '@/components/ui/toast';
import { clearGuestPrefs, hasGuestMirror, readGuestMirror, readGuestMutes, restoreGuestCookies } from '@/lib/guest-prefs';
import { useI18n } from '@/lib/i18n/client';

/**
 * Keeps a visitor's Settings (lib/guest-prefs.ts). Visitors: a cookie the browser
 * dropped is put back from localStorage and the page printed again. Signed-in
 * readers: what they chose before signing in moves into the account once,
 * then this browser forgets it. Renders nothing.
 */
export function GuestPrefsKeeper({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useI18n();
  // The layout stays on screen when a visitor signs in, so remember which side was handled last.
  const handled = useRef<boolean | null>(null);

  useEffect(() => {
    if (handled.current === signedIn) return;
    handled.current = signedIn;
    if (!signedIn) {
      if (restoreGuestCookies()) router.refresh();
      return;
    }
    const mutes = readGuestMutes();
    if (!hasGuestMirror() && mutes.sourceIds.length === 0 && mutes.words.length === 0 && mutes.hiddenIds.length === 0) return;

    const mirror = readGuestMirror();
    void (async () => {
      const result = await adoptGuestPreferences({
        fontSize: mirror.fontSize,
        accent: mirror.accent,
        mutedPapers: [...new Set([...(mirror.mutedPapers ?? []), ...mutes.sourceIds])],
        mutedWords: [...new Set([...(mirror.mutedWords ?? []), ...mutes.words])],
        hiddenStories: [...new Set([...(mirror.hiddenStories ?? []), ...mutes.hiddenIds])],
      });
      if (!result.ok) return; // try again on the next page
      clearGuestPrefs();
      if (result.moved > 0) showToast({ type: 'success', title: t.settings.guestMoved });
      router.refresh();
    })();
  }, [signedIn, router, showToast, t]);

  return null;
}
