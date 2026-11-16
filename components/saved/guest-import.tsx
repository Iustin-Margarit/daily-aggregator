'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getGuestClippings } from '@/lib/guest-clippings';
import { importGuestClippings } from '@/lib/guest-import';
import { useI18n } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';

/**
 * After a visitor signs in (or signs up), the clippings they kept in this
 * browser move into their account (lib/guest-import.ts). Whatever could not be
 * moved stays in this browser and is tried again on the next visit. Renders nothing.
 */
export function GuestImport({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const started = useRef(false);
  const { t, plural } = useI18n();

  useEffect(() => {
    if (started.current) return;
    const { articles, folders } = getGuestClippings();
    if (articles.length === 0 && folders.length === 0) return;
    started.current = true;

    void (async () => {
      const result = await importGuestClippings(createClient(), userId);
      if (!result) {
        // The account could not be reached: try again on the next page.
        started.current = false;
        return;
      }
      if (result.moved > 0) {
        showToast({
          type: 'success',
          title: plural(t.saved.imported, result.moved),
          message: t.saved.importedNote,
          action: { label: t.common.openSaved, onClick: () => router.push('/saved') },
        });
        router.refresh();
      }
    })();
  }, [userId, showToast, router, t, plural]);

  return null;
}
