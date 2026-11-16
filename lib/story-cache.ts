import type { FeedArticle } from '@/lib/types';

/*
 * The stories a reader has just pressed, kept in memory in this tab, so the
 * quick-read sheet (components/story/quick-read.tsx) opens at once with what
 * the card already showed, while the server sends the rest. Only the last
 * few are kept; a reload starts empty (the sheet then waits for the server).
 */
const stories = new Map<string, FeedArticle>();
const KEEP = 40;

/** Call when a story's link is pressed (before the visit starts). */
export function rememberStory(article: FeedArticle) {
  stories.delete(article.slug);
  stories.set(article.slug, article);
  if (stories.size > KEEP) stories.delete(stories.keys().next().value as string);
}

/** The story the reader just pressed, by the slug in its address, if it is still in memory. */
export function recallStory(slug: string): FeedArticle | null {
  let key = slug;
  try {
    key = decodeURIComponent(slug);
  } catch {
    // A broken address: look it up as it is.
  }
  return stories.get(key) ?? null;
}

/*
 * Whether the open sheet lies over a page of the paper the reader came from in this tab (a story pressed on
 * the front page, a section, Saved...): then Close is the browser's Back. A shared link or a reload opens the
 * sheet over a fresh front page with nothing behind it in this tab: then Close goes to the front page instead.
 */
let overPage = false;

export function markSheetOverPage(value: boolean) {
  overPage = value;
}

export function sheetOverPage(): boolean {
  return overPage;
}

/*
 * Sheets on screen. The sheet that opens at once from the card's copy gives way to the server's copy, and a
 * story pressed inside a sheet replaces it: the new sheet then appears in place instead of sliding in again.
 */
let sheetsOpen = 0;
let lastSheetClosed = 0;

/** Call while a sheet is open; returns the call to make when it closes. */
export function holdSheet(): () => void {
  sheetsOpen += 1;
  return () => {
    sheetsOpen -= 1;
    lastSheetClosed = Date.now();
  };
}

/** True when a sheet is open, or closed a moment ago (the one this sheet takes over from). */
export function sheetAlreadyShown(): boolean {
  return sheetsOpen > 0 || Date.now() - lastSheetClosed < 400;
}
