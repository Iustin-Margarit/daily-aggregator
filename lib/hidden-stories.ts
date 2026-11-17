'use client';

import { useEffect, useSyncExternalStore } from 'react';

/*
 * Stories hidden and newspapers muted in this tab, so the page answers at once without a reload.
 *
 * Hiding a story from the quick-read sheet (More > Hide from my paper) closes the sheet and prints, in the story's
 * own place on the page, a small slip: "Story hidden", Undo, and × to fold the slip away. The slip stays until Undo,
 * ×, or the next page load (the server leaves hidden stories out from then on). The cards that can print the slip
 * (ArticleCard, HeadlineList) say they are on the page, so the sheet knows whether the reader will see it.
 *
 * A search still finds hidden stories (the lists leave them out): the sheet's More menu then offers Unhide, so it
 * keeps here whether each story it has looked at is hidden (`useKnownHidden`).
 */

type Hidden = { state: 'hidden' | 'dismissed'; undo: () => Promise<boolean> };

const hidden = new Map<string, Hidden>();
const onPage = new Map<string, number>();
const muted = new Map<string, boolean>();
const known = new Map<string, boolean>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A story hidden just now; `undo` puts it back (true when that worked). */
export function markStoryHidden(id: string, undo: () => Promise<boolean>) {
  hidden.set(id, { state: 'hidden', undo });
  known.set(id, true);
  emit();
}

/** Unhidden (from the sheet's More menu): back in its place on the page if a slip held it, and known as shown. */
export function markStoryShown(id: string) {
  hidden.delete(id);
  known.set(id, false);
  emit();
}

/** What the database or the browser said about a story the sheet is showing. */
export function setKnownHidden(id: string, value: boolean) {
  if (known.get(id) === value) return;
  known.set(id, value);
  emit();
}

/** Whether a story is hidden, as far as this tab knows (undefined: not asked yet). */
export function useKnownHidden(id: string): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => known.get(id),
    () => undefined,
  );
}

/** Undo from the slip: the story comes back in its place (the slip stays if the database says no). */
export async function undoHiddenStory(id: string) {
  const entry = hidden.get(id);
  if (!entry) return;
  if (await entry.undo()) {
    hidden.delete(id);
    known.set(id, false);
    emit();
  }
}

/** × on the slip: folded away for the rest of this page's life. */
export function dismissHiddenStory(id: string) {
  const entry = hidden.get(id);
  if (!entry) return;
  hidden.set(id, { ...entry, state: 'dismissed' });
  emit();
}

/** Whether a story is printed as the slip ('hidden'), folded away ('dismissed'), or as itself (null). */
export function useHiddenStory(id: string): Hidden['state'] | null {
  // Says this story has a place on the page that can print the slip.
  useEffect(() => {
    onPage.set(id, (onPage.get(id) ?? 0) + 1);
    return () => {
      const n = (onPage.get(id) ?? 1) - 1;
      if (n > 0) onPage.set(id, n);
      else onPage.delete(id);
    };
  }, [id]);
  return useSyncExternalStore(
    subscribe,
    () => hidden.get(id)?.state ?? null,
    () => null,
  );
}

/** True when the page prints this story somewhere the slip can take its place. */
export function storyIsOnPage(id: string): boolean {
  return (onPage.get(id) ?? 0) > 0;
}

/** A newspaper muted or unmuted in this tab (undefined: not touched here). */
export function setSourceMuted(sourceId: string, value: boolean) {
  muted.set(sourceId, value);
  emit();
}

export function useSourceMuted(sourceId: string): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => muted.get(sourceId),
    () => undefined,
  );
}

