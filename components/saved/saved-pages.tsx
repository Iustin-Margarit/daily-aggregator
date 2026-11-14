'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { accountBackend, browserBackend } from '@/components/saved/saved-backend';
import { SavedManager, type SavedView } from '@/components/saved/saved-manager';
import { Spinner } from '@/components/ui/spinner';
import { getGuestClippings, getServerGuestClippings, subscribeGuestClippings } from '@/lib/guest-clippings';
import { useHydrated } from '@/lib/use-client-value';
import type { SavedArticle, SavedFolder } from '@/lib/types';

/** The Saved page for a signed-in reader: clippings from the account. */
export function AccountSaved({
  userId,
  initialArticles,
  initialFolders,
  initialView,
}: {
  userId: string;
  initialArticles: SavedArticle[];
  initialFolders: SavedFolder[];
  initialView: SavedView;
}) {
  const backend = useMemo(() => accountBackend(userId), [userId]);
  return <SavedManager backend={backend} initialArticles={initialArticles} initialFolders={initialFolders} initialView={initialView} />;
}

/**
 * The Saved page for a visitor: clippings kept in this browser. They are only
 * known in the browser, so the server prints a short wait instead.
 */
export function GuestSaved({ initialView }: { initialView: SavedView }) {
  const hydrated = useHydrated();
  const clippings = useSyncExternalStore(subscribeGuestClippings, getGuestClippings, getServerGuestClippings);
  const backend = useMemo(() => browserBackend(), []);
  if (!hydrated) {
    return (
      <div className="container flex justify-center py-24" aria-busy="true">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  const view = { ...initialView, folder: clippings.folders.some((f) => f.id === initialView.folder) ? initialView.folder : 'all' };
  return <SavedManager backend={backend} initialArticles={clippings.articles} initialFolders={clippings.folders} initialView={view} />;
}
