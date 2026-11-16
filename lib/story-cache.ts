import type { AlsoReported, ArticleDetail, FeedArticle, RelatedArticle } from '@/lib/types';
import { storyPath } from '@/lib/routes';

/*
 * The quick-read sheet's state, kept in this tab (components/story/quick-read.tsx, QuickReadHost).
 *
 * Pressing a headline opens ONE sheet that stays mounted in the paper's layout: it shows the copy of the story
 * the card already printed at once, changes the address with history.pushState (Next.js keeps usePathname in
 * step, without a route visit or a fetch of the page), and fetches the rest (the server's copy and the two
 * lists at its foot, /api/story/<slug>) into the same sheet. Back, Close and Escape return to the page, which
 * never left. A shared link or a reload prints the story's own page instead (app/(paper)/article/[id]).
 */

// ------------------------------------------------------------------ stories pressed

/** The stories a reader has just pressed, by slug, so the sheet opens at once with what the card showed. */
const stories = new Map<string, FeedArticle>();
const KEEP = 40;

export function rememberStory(article: FeedArticle) {
  stories.delete(article.slug);
  stories.set(article.slug, article);
  if (stories.size > KEEP) stories.delete(stories.keys().next().value as string);
}

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** The story the reader just pressed, by the slug in its address, if it is still in memory. */
export function recallStory(slug: string): FeedArticle | null {
  return stories.get(decodeSlug(slug)) ?? null;
}

// ------------------------------------------------------------------ the server's copy

export type StoryDetail = { article: ArticleDetail | null; related: RelatedArticle[]; alsoReported: AlsoReported[] };
type Entry = { status: 'loading' } | { status: 'done'; data: StoryDetail } | { status: 'failed' };

const details = new Map<string, Entry>();
const KEEP_DETAILS = 30;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function subscribeSheet(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function storyDetail(slug: string): Entry | undefined {
  return details.get(decodeSlug(slug));
}

/** Fetches a story's server copy and lists once (a failure may be tried again by the next press). */
export function loadStoryDetail(slug: string) {
  const key = decodeSlug(slug);
  const known = details.get(key);
  if (known && known.status !== 'failed') return;
  details.set(key, { status: 'loading' });
  if (details.size > KEEP_DETAILS) details.delete(details.keys().next().value as string);
  emit();
  fetch(`/api/story/${encodeURIComponent(key)}`, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (response.status === 404) return { article: null, related: [], alsoReported: [] } satisfies StoryDetail;
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as StoryDetail;
    })
    .then((data) => details.set(key, { status: 'done', data }))
    .catch(() => details.set(key, { status: 'failed' }))
    .finally(emit);
}

/** Forgets the server copies (a story saved, hidden or muted elsewhere is then fetched afresh). */
export function forgetStoryDetails() {
  details.clear();
  emit();
}

// ------------------------------------------------------------------ the sheet

/*
 * Whether the persistent sheet has been opened in this tab. A story's own page (a shared link, a reload) prints
 * its own sheet until the reader presses another story; from then on this one sheet shows every story.
 */
let hostActive = false;

export function sheetHostActive(): boolean {
  return hostActive;
}

/** The history entry the sheet pushed over the page (Close is then the browser's Back). */
const PUSHED = 'pushed';

export function sheetWasPushed(): boolean {
  return typeof window !== 'undefined' && (window.history.state as { sheet?: string } | null)?.sheet === PUSHED;
}

/**
 * Opens a story in the sheet. Over a page it adds a history entry (Back closes the sheet); from inside the
 * sheet (`replace`) it takes the open story's place, so Close still returns to the page underneath.
 */
export function openSheet(slug: string, { replace = false }: { replace?: boolean } = {}) {
  hostActive = true;
  const url = storyPath(slug);
  if (replace) {
    // Keep the mark of the entry being replaced: pushed over a page, or a story's own page.
    window.history.replaceState({ sheet: (window.history.state as { sheet?: string } | null)?.sheet }, '', url);
  } else {
    window.history.pushState({ sheet: PUSHED }, '', url);
  }
  loadStoryDetail(slug);
  emit();
}

/** A plain press (not a new tab or window, not a menu click): the sheet may take it. */
export function isPlainPress(event: React.MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
}

// ------------------------------------------------------------------ stories on the page

/*
 * The stories printed on the page now, by slug, so the keyboard (components/site/keyboard-reading.tsx)
 * can save the story it is on: every headline link adds its story here. Kept small and bounded.
 */
const printed = new Map<string, FeedArticle>();
const KEEP_PRINTED = 400;

export function notePrintedStory(article: FeedArticle) {
  printed.delete(article.slug);
  printed.set(article.slug, article);
  if (printed.size > KEEP_PRINTED) printed.delete(printed.keys().next().value as string);
}

export function printedStory(slug: string): FeedArticle | null {
  return printed.get(slug) ?? null;
}
