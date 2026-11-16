/*
 * Whether a signed-in reader has saved a story, as last changed in this tab: the card, the
 * quick-read sheet and the "s" key (components/site/keyboard-reading.tsx) all read and write it,
 * so saving in one place shows in the others at once. A story nobody touched in this tab shows
 * what the server sent (`is_saved`). Visitors' saved stories have their own store
 * (lib/guest-clippings.ts).
 */

const saved = new Map<string, boolean>();
const listeners = new Set<() => void>();

export function subscribeSavedState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The saved state set in this tab, or undefined (then the server's copy holds). */
export function savedState(articleId: string): boolean | undefined {
  return saved.get(articleId);
}

export function setSavedState(articleId: string, value: boolean) {
  if (saved.get(articleId) === value) return;
  saved.set(articleId, value);
  listeners.forEach((listener) => listener());
}
