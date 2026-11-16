import Link from 'next/link';
import { ArticleCard, type StoryVariant } from '@/components/articles/article-card';
import { PageTurn } from '@/components/feed/page-turn';
import { Pagination } from '@/components/feed/pagination';
import { EmptyState } from '@/components/site/empty-state';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { SectionHead } from '@/components/site/section-head';
import { Button } from '@/components/ui/button';
import { gridGaps, pageCount, pageHref } from '@/lib/feed';
import type { Translator } from '@/lib/i18n';
import { FRONT_PATH } from '@/lib/routes';
import type { FeedArticle } from '@/lib/types';

type StoryListProps = {
  /** The page of stories the server loaded, and whether loading failed. */
  articles: FeedArticle[];
  failed: boolean;
  page: number;
  /** Lists open page 1 with a lead story and "In other news"; a search does not. */
  lead: boolean;
  /** The words of a search (for its "nothing found" page). */
  search?: string;
  /** The list's own address and query, for the page links (lib/feed.ts, pageHref). */
  path: string;
  query: Record<string, string>;
  userId: string | null;
  i18n: Translator;
};

/** The last page: "— 30 —", the old printers' mark for the end, and the office cat asleep. */
function EndOfEdition({ i18n: { t } }: { i18n: Translator }) {
  return (
    <div className="card-paper mx-auto flex max-w-2xl flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
      {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
      <img src="/plates/cat.webp" alt={t.feed.catAlt} width={1000} height={819} loading="lazy" className="w-44 shrink-0 rounded-[2px] border border-rule/40 bg-card p-1.5 shadow-paper" />
      <div>
        <p className="font-display text-2xl font-semibold tracking-[0.3em]">— 30 —</p>
        <p className="mt-2 font-display text-lg italic">{t.feed.endTitle}</p>
        <p className="mt-1 text-[0.95rem] text-muted-foreground">{t.feed.endNote}</p>
      </div>
    </div>
  );
}

/**
 * Fills the empty slots of the grid's last row (styles: .grid-filler): "Continued on page 3",
 * as old papers sent readers on, or a way back to page 1 on the last page. Hidden where no slot
 * is empty (and always on phones, with one column).
 */
function GridFiller({ gaps, next, href, i18n: { t, fmt } }: { gaps: { two: number; three: number }; next: number | null; href: string | null; i18n: Translator }) {
  return (
    <div className="grid-filler" data-gap2={gaps.two} data-gap3={gaps.three}>
      <Engraving name={next ? 'newsboy' : 'typewriter'} className="h-24 max-w-[8rem]" />
      {next ? (
        <>
          <p className="label mt-4 text-muted-foreground">{t.feed.continued}</p>
          <p className="mt-1 font-display text-[1.5rem] font-semibold italic">{fmt(t.feed.onPage, { n: next })}</p>
        </>
      ) : (
        <>
          <p className="label mt-4 text-muted-foreground">{t.feed.lastPage}</p>
          <p className="mt-1 text-balance font-display text-[1.35rem] font-semibold italic">{t.feed.everyStory}</p>
        </>
      )}
      {href && (
        <Link href={href} scroll={false} className="group/read mt-4 inline-flex items-center gap-2.5 font-display text-[1.05rem] font-semibold text-(--brass-ink) hover:text-foreground">
          {next ? fmt(t.feed.turnTo, { n: next }) : t.feed.backToPage1}
          <Ornament name="fist" className="fist-poke h-[1rem] [--ornament-ink:currentColor]" />
        </Link>
      )}
    </div>
  );
}

/**
 * One page of a list of stories (the latest, a section, a newspaper, a search), printed by the
 * server: page 1 opens with a lead story and "In other news" (not on a search), then the grid
 * and the page numbers. Page links are plain links; Back and Forward are the browser's own.
 */
export function StoryList({ articles, failed, page, lead, search, path, query, userId, i18n }: StoryListProps) {
  const { t, fmt, plural } = i18n;
  const hrefFor = (p: number) => pageHref(path, query, p);
  const total = Number(articles[0]?.total_count ?? 0);
  const pages = pageCount(total, lead);
  const isLastPage = page >= pages;

  if (articles.length === 0) {
    return (
      <section className="mt-6" aria-label={t.feed.stories}>
        {failed ? (
          <EmptyState
            level={2}
            engraving="press"
            title={t.feed.jammed}
            description={t.feed.jammedNote}
            action={
              <Button asChild>
                <Link href={hrefFor(page)}>{t.common.tryAgain}</Link>
              </Button>
            }
          />
        ) : page > 1 ? (
          <EmptyState
            level={2}
            engraving="kitten-peer"
            title={fmt(t.feed.noPage, { n: page })}
            description={t.feed.noPageNote}
            action={
              <Button asChild>
                <Link href={hrefFor(1)}>{t.feed.backToPage1}</Link>
              </Button>
            }
          />
        ) : search ? (
          <EmptyState level={2} engraving="kitten-peer" title={fmt(t.feed.nothingAbout, { q: search })} description={t.feed.nothingAboutNote} />
        ) : (
          <EmptyState
            level={2}
            engraving="kitten-curious"
            title={t.feed.noStories}
            description={t.feed.noStoriesNote}
            action={
              <Button asChild>
                <Link href={FRONT_PATH}>{t.feed.backToFront}</Link>
              </Button>
            }
          />
        )}
      </section>
    );
  }

  // Page 1 of a list (not a search) opens like a front page: the lead story and "In other news".
  const leadStory = page === 1 && lead && articles.length >= 4 ? articles[0] : null;
  // 1 lead + 3 in the sidebar leaves 12 for the grid: four rows of three.
  const sidebar = leadStory ? articles.slice(1, 4) : [];
  const rest = leadStory ? articles.slice(4) : articles;
  const firstInGrid = leadStory ? 4 : 0;
  // A short last page (or an odd count in two columns) leaves empty slots in the last row; a "continued" slip fills them.
  const gaps = gridGaps(rest.length);
  const story = (article: FeedArticle, index: number, variant?: StoryVariant) => (
    <ArticleCard article={article} userId={userId} eagerImage={index < 3} variant={variant} />
  );

  return (
    // Clipped sideways so a page swinging in (the page turn) never makes the page scroll sideways.
    <section className="mt-6 overflow-x-clip" aria-label={t.feed.stories}>
      <PageTurn page={page}>
        {(page > 1 || search) && (
          <p className="mb-4 flex items-baseline justify-between gap-4 font-label text-[0.92rem] text-muted-foreground">
            <span className="font-medium text-foreground">{fmt(t.feed.pageN, { n: page })}</span>
            <span>
              {plural(t.feed.storyCount, total)} · {plural(t.feed.pageCount, pages)}
            </span>
          </p>
        )}

        {/* Page one: the lead story and "In other news", divided by a column rule. */}
        {leadStory && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-0">
            <div className="flex lg:pr-9">{story(leadStory, 0, 'lead')}</div>
            <aside className="flex flex-col border-t border-rule/40 pt-6 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0" aria-labelledby="other-news">
              <SectionHead id="other-news" engraving="telegraph">
                {t.landing.otherNews}
              </SectionHead>
              <div className="mt-2 divide-y divide-rule/30">
                {sidebar.map((article, index) => (
                  <div key={article.id} className="py-4 last:pb-0">
                    {story(article, index + 1, 'compact')}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {leadStory && rest.length > 0 && <ScrollDivider className="mb-10 mt-12" />}

        <div className="news-grid">
          {rest.map((article, index) => (
            <div key={article.id}>{story(article, index + firstInGrid)}</div>
          ))}
          {(gaps.two > 0 || gaps.three > 0) && (
            <GridFiller gaps={gaps} next={isLastPage ? null : page + 1} href={isLastPage ? (page > 1 ? hrefFor(1) : null) : hrefFor(page + 1)} i18n={i18n} />
          )}
        </div>

        <div className="mt-10 space-y-10">
          <Pagination page={page} pages={pages} path={path} query={query} />
          {isLastPage && <EndOfEdition i18n={i18n} />}
        </div>
      </PageTurn>
    </section>
  );
}
