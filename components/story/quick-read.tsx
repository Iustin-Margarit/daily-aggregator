'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArticleActionsBar } from '@/components/article/article-actions-bar';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { DropCap } from '@/components/articles/drop-cap';
import { Ornament } from '@/components/site/ornament';
import { TimeAgo } from '@/components/site/time-ago';
import { AlsoReportedBy, MoreFromDesk } from '@/components/story/sheet-lists';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toastWasJustPressed } from '@/components/ui/toast';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatReadingTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import { safeExternalUrl } from '@/lib/redirect';
import { FRONT_PATH, paperPath, storyPath } from '@/lib/routes';
import { loadStoryDetail, recallStory, sheetHostActive, sheetWasPushed, storyDetail, subscribeSheet } from '@/lib/story-cache';
import { cleanText } from '@/lib/text';
import type { FeedArticle } from '@/lib/types';

const ARTICLE_PREFIX = storyPath('');

function samePath(a: string, b: string) {
  try {
    return decodeURIComponent(a) === decodeURIComponent(b);
  } catch {
    return a === b;
  }
}

/*
 * While a sheet is open the page underneath stays put without being restyled or laid out again: the overlay
 * swallows wheel and touch scrolling (styles: .sheet-overlay, touch-action none) and the sheet's own scroller
 * keeps its scrolling to itself (overscroll-behavior). The street banner is paused (.st-behind-sheet on the
 * street's own element, which restyles only its figures).
 *
 * Measured with the CPU slowed 4x (2026-11-16): Radix's modal mode (a stylesheet inserted, pointer-events on
 * <body>) restyled every element of the page, about 1,800, on each open and close; a class on <html> with a rule
 * like "html.x .st *" did the same; overflow hidden on <html> laid the whole page out again. None is used.
 */
let locks = 0;
function usePausedPage(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    const streets = document.querySelectorAll('.st');
    streets.forEach((street) => street.classList.add('st-behind-sheet'));
    return () => {
      locks -= 1;
      if (locks === 0) streets.forEach((street) => street.classList.remove('st-behind-sheet'));
    };
  }, [active]);
}

/** The overlay: a press on it closes the sheet (Radix: outside), a wheel or a swipe on it scrolls nothing. */
function Overlay() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (event: Event) => event.preventDefault();
    el.addEventListener('wheel', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => {
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, []);
  return <div ref={ref} aria-hidden="true" className="sheet-overlay fixed inset-0 z-50 bg-[hsl(40_12%_6%/0.55)]" />;
}

/** Hidden at once on Close, until the address has changed (Back takes a moment). */
function useClosing(pathname: string) {
  const [closingAt, setClosingAt] = useState<string | null>(null);
  if (closingAt !== null && closingAt !== pathname) setClosingAt(null);
  return [closingAt === pathname, () => setClosingAt(pathname)] as const;
}

/**
 * The sheet's paper: the photograph, the headline, the summary, the big way on to the publisher's full story,
 * the story's actions, and at its foot the same news from other papers and more from the desk. From the right
 * on wide screens and from the bottom on phones, over a dimmed page.
 */
function Sheet({
  open,
  onClose,
  story,
  waiting,
  missing,
  userId,
  extras,
  scrollKey,
}: {
  open: boolean;
  onClose: () => void;
  /** What is known of the story (the card's copy, then the server's); null while nothing is. */
  story: FeedArticle | null;
  /** Nothing known yet, but on its way. */
  waiting: boolean;
  /** The story is gone. */
  missing: boolean;
  userId: string | null;
  extras: ReactNode;
  /** A new story in the same sheet: back to its top. */
  scrollKey: string;
}) {
  const { t, fmt } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  usePausedPage(open);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  const title = story ? cleanText(story.title) : '';
  const summary = story ? cleanText(story.summary) : '';
  const author = story?.author ? cleanText(story.author) : null;
  const readingTime = story ? formatReadingTime(story.reading_minutes) : null;
  const style = getCategoryStyle(story?.category_name);
  const publisher = story ? safeExternalUrl(story.url) : null;

  return (
    // Not modal in Radix's sense (see usePausedPage); the overlay below takes every press outside the sheet,
    // focus moves into the sheet and Tab loops inside it, and it is announced as a modal dialog.
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()} modal={false}>
      <DialogPrimitive.Portal>
        {open && <Overlay />}
        <DialogPrimitive.Content
          data-section={style.key ?? undefined}
          aria-describedby={undefined}
          aria-modal="true"
          // A notice (Undo, Open saved stories) stands outside the sheet but is not "outside" it: pressing it
          // must not close the sheet (components/ui/toast.tsx, toastWasJustPressed).
          onInteractOutside={(event) => {
            if (toastWasJustPressed(event.target)) event.preventDefault();
          }}
          className="quick-read card-paper fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col border-t-[3px] border-double border-rule/60 shadow-float lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[min(40rem,92vw)] lg:border-l-[3px] lg:border-t-0"
        >
          {/* The sheet's own bar: what it is, and Close, always in reach. */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule/40 px-5 py-2.5 sm:px-7">
            <p className="kicker">{t.story.quickRead}</p>
            <DialogPrimitive.Close className="inline-flex h-10 items-center gap-2 frame-ruled rounded-[3px] px-3.5 font-label text-[0.82rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {t.common.close}
              <span aria-hidden="true" className="font-display text-[1.3rem] leading-none normal-case">
                ×
              </span>
            </DialogPrimitive.Close>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-5 sm:px-7">
            {story ? (
              <article>
                <div className="photo-plate">
                  <ArticleImage src={story.image_url} alt="" category={story.category_name} width={1200} sizes="(min-width: 1024px) 40rem, 100vw" eager className="aspect-video w-full" />
                </div>
                <div className="mt-5">
                  <CategoryBadge name={story.category_name} />
                </div>
                <DialogPrimitive.Title className="headline mt-3 text-balance text-[1.75rem] sm:text-[2.2rem]">{title}</DialogPrimitive.Title>
                <p className="byline mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {author && (
                    <>
                      <span>{fmt(t.story.by, { author })}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <Link href={paperPath(story.source_name)} className="font-medium text-foreground/80 underline-offset-4 hover:underline">
                    {story.source_name}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <TimeAgo date={story.published_at} />
                  {readingTime && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">{readingTime}</span>
                    </>
                  )}
                </p>
                {summary ? (
                  <DropCap text={summary} className="news-text mt-5 text-[1.1rem] leading-relaxed text-foreground/90" />
                ) : (
                  <p className="mt-5 italic text-muted-foreground">{t.article.noSummary}</p>
                )}

                {/* The way on to the whole story, one press away. */}
                {publisher && (
                  <div className="mt-6">
                    <Button asChild size="lg" className="group/read h-auto min-h-12 w-full whitespace-normal py-2.5 text-center leading-snug">
                      <a href={publisher} target="_blank" rel="noopener noreferrer">
                        {fmt(t.article.fullReport, { source: story.source_name })}
                        <Ornament name="fist" className="fist-poke w-[1.45rem] shrink-0 [--ornament-ink:currentColor]" />
                        <span className="sr-only">{t.article.opensPublisher}</span>
                      </a>
                    </Button>
                    <p className="mt-2 text-pretty text-center text-[0.88rem] italic text-muted-foreground">{t.article.summaryNote}</p>
                  </div>
                )}

                <div className="mt-6">
                  {/* Hide closes the sheet: the story's place on the page shows the hidden slip. */}
                  <ArticleActionsBar article={story} userId={userId} onHidden={onClose} />
                </div>

                {extras}
              </article>
            ) : waiting ? (
              <div aria-busy="true">
                <DialogPrimitive.Title className="sr-only">{t.story.quickRead}</DialogPrimitive.Title>
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="mt-5 h-6 w-28" />
                <Skeleton className="mt-3 h-10 w-full" />
                <Skeleton className="mt-2 h-10 w-3/4" />
                <Skeleton className="mt-6 h-32 w-full" />
              </div>
            ) : (
              <div className="py-10 text-center">
                <DialogPrimitive.Title className="headline text-2xl">{missing ? t.article.pulled : t.common.somethingWrong}</DialogPrimitive.Title>
                <p className="mt-2 text-muted-foreground">{missing ? t.article.pulledNote : t.common.tryAgain}</p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * THE quick-read sheet of the paper, mounted once in its layout (app/(paper)/layout.tsx) and never remounted:
 * a headline pressed anywhere (StoryLink, SheetLink) opens it at once with the card's copy and changes the
 * address without a route visit; the server's copy and the two lists at the foot arrive into the same sheet
 * (lib/story-cache.ts). It shows while the address is a story's, so Back and Forward close and reopen it.
 */
export function QuickReadHost({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = useSyncExternalStore(subscribeSheet, sheetHostActive, () => false);
  const slug = pathname.startsWith(ARTICLE_PREFIX) ? pathname.slice(ARTICLE_PREFIX.length) : null;
  const entry = useSyncExternalStore(
    subscribeSheet,
    () => (slug ? storyDetail(slug) : undefined),
    () => undefined,
  );
  const [closing, close] = useClosing(pathname);
  const open = active && slug !== null && !closing;

  // Back or Forward to a story the sheet has not fetched yet (or a fetch that failed earlier).
  useEffect(() => {
    if (active && slug) loadStoryDetail(slug);
  }, [active, slug]);

  const detail = entry?.status === 'done' ? entry.data : null;
  const card = slug ? recallStory(slug) : null;
  const story = detail?.article ?? (detail ? null : card);

  const onClose = () => {
    close();
    // Pushed over a page: the browser's Back returns to it as it was. Otherwise (taken over from a story's
    // own page) the front page underneath becomes the address.
    if (sheetWasPushed()) window.history.back();
    else router.replace(FRONT_PATH, { scroll: false });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      story={story}
      waiting={!detail && entry?.status !== 'failed'}
      missing={Boolean(detail && !detail.article)}
      userId={userId}
      scrollKey={slug ?? ''}
      extras={
        detail && (detail.alsoReported.length > 0 || detail.related.length > 0) ? (
          // Below the story's actions, so they arrive without moving anything the reader is looking at.
          <div className="sheet-extras">
            {detail.alsoReported.length > 0 && <AlsoReportedBy stories={detail.alsoReported} />}
            {detail.related.length > 0 && <MoreFromDesk stories={detail.related} categoryName={story?.category_name ?? null} />}
          </div>
        ) : null
      }
    />
  );
}

/**
 * A story's own address opened directly (a shared link, a reload): the server prints the front page with this
 * sheet open over it. Close goes to the front page rather than out of the site. A story pressed from here opens
 * in the paper's one sheet (QuickReadHost), and this one gives way.
 */
export function StandaloneQuickRead({ slug, article, userId, extras }: { slug: string; article: FeedArticle; userId: string | null; extras: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hostActive = useSyncExternalStore(subscribeSheet, sheetHostActive, () => false);
  const [closing, close] = useClosing(pathname);
  const open = !closing && !hostActive && samePath(pathname, storyPath(slug));
  return (
    <Sheet
      open={open}
      onClose={() => {
        close();
        router.replace(FRONT_PATH, { scroll: false });
      }}
      story={article}
      waiting={false}
      missing={false}
      userId={userId}
      extras={extras}
      scrollKey={slug}
    />
  );
}
