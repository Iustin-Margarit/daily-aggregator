'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArticleActionsBar } from '@/components/article/article-actions-bar';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { DropCap } from '@/components/articles/drop-cap';
import { Ornament } from '@/components/site/ornament';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatReadingTime } from '@/lib/format';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { safeExternalUrl } from '@/lib/redirect';
import { FRONT_PATH, paperPath, storyPath } from '@/lib/routes';
import { holdSheet, markSheetOverPage, recallStory, sheetAlreadyShown, sheetOverPage } from '@/lib/story-cache';
import { cleanText } from '@/lib/text';
import type { FeedArticle, RelatedArticle } from '@/lib/types';

type QuickReadProps = {
  slug: string;
  /** The story from the server; undefined while it is on its way (the sheet shows the card's copy), null when it does not exist. */
  article?: FeedArticle | null;
  userId?: string | null;
  /** More from the same desk, printed at the foot (undefined while on its way). */
  related?: RelatedArticle[];
  /**
   * Opened from its address (a shared link, a reload): the sheet lies over a fresh front page, shows only
   * while the address is still its own (another story pressed from it opens its own sheet), and Close goes
   * to the front page rather than out of the site.
   */
  standalone?: boolean;
};

function samePath(a: string, b: string) {
  try {
    return decodeURIComponent(a) === decodeURIComponent(b);
  } catch {
    return a === b;
  }
}

/**
 * A story, read without leaving the page: pressing a headline opens this sheet over the paper, from the
 * right on wide screens and from the bottom on phones. The photograph, the headline, the summary, the
 * big way on to the publisher's full story, the story's actions and three more from the same desk.
 * Close, Escape and the browser's Back return to the page underneath, where it was.
 */
export function QuickRead({ slug, article, userId = null, related, standalone = false }: QuickReadProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, fmt } = useI18n();
  const [closing, setClosing] = useState(false);
  const story = article === undefined ? recallStory(slug) : article;
  const pending = article === undefined;
  // The sheet shows while the address is a story's: a link inside it that leads elsewhere (a newspaper's page)
  // changes the address, and the sheet closes (the slot keeps its last page on a soft visit, so it is told here).
  const open = !closing && (standalone ? samePath(pathname, storyPath(slug)) : pathname.startsWith('/article/'));
  // Taking over from a sheet already on screen: appear in place, without sliding in again.
  const [instant] = useState(sheetAlreadyShown);
  const still = instant ? { animation: 'none' } : undefined;

  useEffect(() => (open ? holdSheet() : undefined), [open]);

  // Opened from its own address: nothing of the paper lies behind it in this tab.
  useEffect(() => {
    if (standalone) markSheetOverPage(false);
  }, [standalone]);

  const close = () => {
    // Shut at once; the page underneath is already there.
    setClosing(true);
    if (!standalone && sheetOverPage()) router.back();
    else router.replace(FRONT_PATH, { scroll: false });
  };

  const title = story ? cleanText(story.title) : '';
  const summary = story ? cleanText(story.summary) : '';
  const author = story?.author ? cleanText(story.author) : null;
  const readingTime = story ? formatReadingTime(story.reading_minutes) : null;
  const style = getCategoryStyle(story?.category_name);
  const publisher = story ? safeExternalUrl(story.url) : null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay style={still} className="fixed inset-0 z-50 bg-[hsl(40_12%_6%/0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          style={still}
          data-section={style.key ?? undefined}
          aria-describedby={undefined}
          className="quick-read card-paper fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col border-t-[3px] border-double border-rule/60 shadow-float duration-300 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[min(40rem,92vw)] lg:border-l-[3px] lg:border-t-0 lg:data-[state=open]:slide-in-from-right lg:data-[state=open]:slide-in-from-bottom-0"
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-5 sm:px-7">
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

                {/* The story's actions arrive with the server's copy (they need to know who is reading). */}
                <div className="mt-6">{pending ? <Skeleton className="h-11 w-full" /> : <ArticleActionsBar article={story} userId={userId} />}</div>

                {related && related.length > 0 && (
                  <MoreFromDesk
                    stories={related}
                    heading={fmt(t.article.moreFromDesk, { section: sectionText(t, style.key, story.category_name).name })}
                  />
                )}
              </article>
            ) : pending ? (
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
                <DialogPrimitive.Title className="headline text-2xl">{t.article.pulled}</DialogPrimitive.Title>
                <p className="mt-2 text-muted-foreground">{t.article.pulledNote}</p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Three more stories from the same desk, as headline lines. Each opens in this sheet's place (the address
 * is replaced, not added), so Close still returns to the page the reader started from.
 */
function MoreFromDesk({ stories, heading }: { stories: RelatedArticle[]; heading: string }) {
  return (
    <section aria-labelledby="more-from-desk" className="mt-8 border-t-[3px] border-double border-rule/45 pt-4">
      <h3 id="more-from-desk" className="kicker">
        {heading}
      </h3>
      <ul className="mt-2 divide-y divide-rule/30">
        {stories.map((story) => (
          <li key={story.id} data-section={getCategoryStyle(story.category_name).key ?? undefined}>
            <Link href={storyPath(story.slug)} replace scroll={false} className="group block py-3">
              <span className="headline line-clamp-3 text-[1.1rem] decoration-1 underline-offset-2 group-hover:underline">{cleanText(story.title)}</span>
              <span className="byline mt-1 block">
                <span className="font-medium text-foreground/80">{story.source_name}</span> · <TimeAgo date={story.published_at} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
