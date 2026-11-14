'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArticleCard, type StoryVariant } from '@/components/articles/article-card';
import { ArticleGridSkeleton } from '@/components/articles/article-card-skeleton';
import { hideArticle, muteSource, unhideArticle, unmuteSource } from '@/components/articles/moderation';
import { FeedSearch, FeedToolbar } from '@/components/feed/feed-toolbar';
import { Pagination } from '@/components/feed/pagination';
import { MonthAlmanac, OnThisDayCard } from '@/components/site/almanac';
import { EmptyState } from '@/components/site/empty-state';
import { Engraving } from '@/components/site/engraving';
import { FrontMasthead } from '@/components/site/front-masthead';
import { Ornament } from '@/components/site/ornament';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { SectionHead } from '@/components/site/section-head';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { feedRpcArgs, filtersToQueryString, hasFrontPage, pageCount } from '@/lib/feed';
import type { OnThisDay } from '@/lib/on-this-day';
import { createClient } from '@/lib/supabase/client';
import type { Category, FeedArticle, FeedFilters, FeedSort, SourceOption } from '@/lib/types';
import { useClientValue } from '@/lib/use-client-value';
import { cn } from '@/lib/utils';

type FeedViewProps = {
  /** null for a visitor without an account (they clip into this browser and cannot hide or mute). */
  userId: string | null;
  username: string | null;
  categories: Category[];
  sources: SourceOption[];
  preferredCategoryIds: string[];
  initialFilters: FeedFilters;
  initialPage: number;
  initialArticles: FeedArticle[];
  initialAsOf: string;
  /** The server could not load the stories (the database is unreachable): show "The presses jammed" with Try again. */
  initialError?: boolean;
  /** Today's anniversaries for the almanac box under "In other news" (null when Wikipedia could not be reached). */
  onThisDay: OnThisDay | null;
  /** True on a brand-new install while the first ingestion run is in progress. */
  waitingForFirstIngest: boolean;
  /** True when there are no articles at all and no service key to fetch them. */
  databaseEmptyWithoutIngestion?: boolean;
};

type Status = 'idle' | 'loading' | 'error';

function insertBack(list: FeedArticle[], removed: { article: FeedArticle; index: number }[]) {
  const next = [...list];
  for (const { article, index } of [...removed].sort((a, b) => a.index - b.index)) {
    if (!next.some((a) => a.id === article.id)) next.splice(Math.min(index, next.length), 0, article);
  }
  return next;
}

const totalOf = (list: FeedArticle[]) => Number(list[0]?.total_count ?? 0);

function greetingFor(hour: number) {
  return hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** Uses the reader's own clock, so it is only known in the browser. */
function Greeting({ name }: { name: string }) {
  const text = useClientValue(() => greetingFor(new Date().getHours()), 'Welcome back');
  return (
    <>
      {text}, {name}.
    </>
  );
}

/** The last page: "— 30 —", the old printers' mark for the end, and the office cat asleep. */
function EndOfEdition() {
  return (
    <div className="card-paper mx-auto flex max-w-2xl flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
      {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
      <img
        src="/plates/cat.webp"
        alt="A tabby cat asleep on a red cushion (Théophile Steinlen, 1909)"
        width={1000}
        height={819}
        loading="lazy"
        className="w-44 shrink-0 rounded-xl shadow-paper"
      />
      <div>
        <p className="font-display text-2xl font-semibold tracking-[0.3em]">— 30 —</p>
        <p className="mt-2 font-display text-lg italic">That is the end of today’s edition.</p>
        <p className="mt-1 text-[0.95rem] text-muted-foreground">Even the office cat has nodded off. Fresh stories arrive every hour.</p>
      </div>
    </div>
  );
}

/**
 * Fills the empty slots of the grid's last row (styles: .grid-filler): "Continued
 * on page 3", as old papers sent readers on, or a way back to the front page on
 * the last page. `gaps` is how many slots are empty with two and three columns;
 * it is hidden where there are none (and always on phones, with one column).
 */
function GridFiller({
  gaps,
  next,
  onTurn,
  hrefFor,
  showFrontPageLink,
}: {
  gaps: { two: number; three: number };
  next: number | null;
  onTurn: (page: number) => void;
  hrefFor: (page: number) => string;
  showFrontPageLink: boolean;
}) {
  const target = next ?? (showFrontPageLink ? 1 : null);
  const go = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (target === null || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onTurn(target);
  };
  return (
    <div className="grid-filler" data-gap2={gaps.two} data-gap3={gaps.three}>
      <Engraving name={next ? 'newsboy' : 'typewriter'} className="h-24 max-w-[8rem]" />
      {next ? (
        <>
          <p className="label mt-4 text-muted-foreground">Continued</p>
          <p className="mt-1 font-display text-[1.5rem] font-semibold italic">on page {next}</p>
        </>
      ) : (
        <>
          <p className="label mt-4 text-muted-foreground">The last page</p>
          <p className="mt-1 font-display text-[1.35rem] font-semibold italic">That is every story for now</p>
        </>
      )}
      {target !== null && (
        <a href={hrefFor(target)} onClick={go} className="group/read mt-4 inline-flex items-center gap-2.5 font-display text-[1.05rem] font-semibold text-(--brass-ink) hover:text-foreground">
          {next ? `Turn to page ${next}` : 'Back to the front page'}
          <Ornament name="fist" className="fist-poke h-[1rem] [--ornament-ink:currentColor]" />
        </a>
      )}
    </div>
  );
}

export function FeedView({
  userId,
  username,
  categories,
  sources,
  preferredCategoryIds,
  initialFilters,
  initialPage,
  initialArticles,
  initialAsOf,
  initialError = false,
  onThisDay,
  waitingForFirstIngest,
  databaseEmptyWithoutIngestion = false,
}: FeedViewProps) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [articles, setArticles] = useState(initialArticles);
  const [total, setTotal] = useState(totalOf(initialArticles));
  const [status, setStatus] = useState<Status>(initialError ? 'error' : 'idle');
  const [waiting, setWaiting] = useState(waitingForFirstIngest && initialArticles.length === 0);
  /** The last page turn (Previous / Next page, back / forward): plays the page-turn animation once (styles: .page-turn-*). */
  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; key: number } | null>(null);
  const turnDir = useRef<'next' | 'prev' | null>(null);

  const requestId = useRef(0);
  const asOfRef = useRef(initialAsOf);
  const filtersRef = useRef(initialFilters);
  const articlesRef = useRef(initialArticles);
  const topRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(initialPage);
  articlesRef.current = articles;
  pageRef.current = page;

  const urlFor = useCallback(
    (nextFilters: FeedFilters, nextPage: number) => `/feed${filtersToQueryString(nextFilters, categories, preferredCategoryIds, nextPage)}`,
    [categories, preferredCategoryIds],
  );

  /** Loads one page. `fresh` takes a new snapshot so newly fetched stories appear. */
  const load = useCallback(
    async (nextFilters: FeedFilters, nextPage: number, fresh: boolean) => {
      const id = ++requestId.current;
      if (fresh) asOfRef.current = new Date().toISOString();
      setStatus('loading');

      const { data, error } = await createClient().rpc('get_feed', feedRpcArgs(nextFilters, nextPage, asOfRef.current));
      if (id !== requestId.current) return; // a newer request superseded this one

      if (error) {
        setStatus('error');
        showToast({ type: 'error', title: 'Could not load the stories', message: error.message });
        return;
      }
      const rows = (data ?? []) as FeedArticle[];
      setArticles(rows);
      setPage(nextPage);
      if (turnDir.current) {
        setTurn({ dir: turnDir.current, key: Date.now() });
        turnDir.current = null;
      }
      if (rows.length > 0 || nextPage === 1) setTotal(totalOf(rows));
      setStatus('idle');
      if (rows.length > 0) setWaiting(false);
    },
    [showToast],
  );

  /** New filters always start again at page 1. */
  const updateFilters = useCallback(
    (patch: Partial<FeedFilters>) => {
      const next = { ...filtersRef.current, ...patch };
      filtersRef.current = next;
      setFilters(next);
      window.history.replaceState(window.history.state, '', urlFor(next, 1));
      void load(next, 1, true);
    },
    [load, urlFor],
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      turnDir.current = nextPage > pageRef.current ? 'next' : 'prev';
      window.history.pushState(window.history.state, '', urlFor(filtersRef.current, nextPage));
      topRef.current?.scrollIntoView({ block: 'start' });
      void load(filtersRef.current, nextPage, false);
    },
    [load, urlFor],
  );

  // Back / forward buttons move between pages.
  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname !== '/feed') return;
      const value = Number.parseInt(new URLSearchParams(window.location.search).get('page') ?? '1', 10);
      const target = Number.isFinite(value) && value > 1 ? value : 1;
      if (target !== pageRef.current) turnDir.current = target > pageRef.current ? 'next' : 'prev';
      void load(filtersRef.current, target, false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [load]);

  // First run on an empty database: poll until the background ingestion lands.
  useEffect(() => {
    if (!waiting) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > 30) {
        window.clearInterval(timer);
        setWaiting(false);
        return;
      }
      void load(filtersRef.current, 1, true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [waiting, load]);

  const handleHide = useCallback(
    async (article: FeedArticle) => {
      if (!userId) return;
      const index = articlesRef.current.findIndex((a) => a.id === article.id);
      setArticles((list) => list.filter((a) => a.id !== article.id));
      setTotal((t) => Math.max(0, t - 1));
      const { error } = await hideArticle(userId, article.id);
      if (error) {
        setArticles((list) => insertBack(list, [{ article, index }]));
        setTotal((t) => t + 1);
        showToast({ type: 'error', title: 'Could not hide the story', message: error.message });
        return;
      }
      showToast({
        type: 'success',
        title: 'Story hidden',
        message: 'It will not appear in your paper again.',
        action: {
          label: 'Undo',
          onClick: async () => {
            await unhideArticle(userId, article.id);
            setArticles((list) => insertBack(list, [{ article, index }]));
            setTotal((t) => t + 1);
          },
        },
      });
    },
    [userId, showToast],
  );

  const handleMute = useCallback(
    async (article: FeedArticle) => {
      if (!userId) return;
      const removed = articlesRef.current
        .map((a, index) => ({ article: a, index }))
        .filter((entry) => entry.article.source_id === article.source_id);
      setArticles((list) => list.filter((a) => a.source_id !== article.source_id));
      const { error } = await muteSource(userId, article.source_id);
      if (error) {
        setArticles((list) => insertBack(list, removed));
        showToast({ type: 'error', title: 'Could not mute the source', message: error.message });
        return;
      }
      showToast({
        type: 'success',
        title: `${article.source_name} muted`,
        message: 'Unmute it any time in your settings.',
        action: {
          label: 'Undo',
          onClick: async () => {
            await unmuteSource(userId, article.source_id);
            void load(filtersRef.current, pageRef.current, false);
          },
        },
      });
      // The page now has gaps; reload it so it is full again.
      void load(filtersRef.current, pageRef.current, false);
    },
    [userId, showToast, load],
  );

  const selectedNames = categories.filter((c) => filters.categoryIds.includes(c.id)).map((c) => c.name);
  const subtitle =
    filters.search !== ''
      ? `Searching the paper for “${filters.search}”.`
      : selectedNames.length === 0
        ? 'Every section, freshest first.'
        : selectedNames.length <= 3
          ? `Your edition covers ${selectedNames.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
          : `Your edition covers ${selectedNames.slice(0, 2).join(', ')} and ${selectedNames.length - 2} more sections.`;

  const loading = status === 'loading';
  const pages = pageCount(total, hasFrontPage(filters));
  const isEmpty = articles.length === 0 && !loading;
  const isLastPage = page >= pages;
  // The front page layout (lead story + sidebar) is only for page 1 of the plain "latest" view.
  const frontPage = page === 1 && hasFrontPage(filters) && articles.length >= 4;
  const lead = frontPage ? articles[0] : null;
  // 1 lead + 3 in the sidebar (with the almanac under them) leaves 12 for the grid: four rows of three.
  const sidebar = frontPage ? articles.slice(1, 4) : [];
  const rest = frontPage ? articles.slice(4) : articles;
  const firstInGrid = lead ? 4 : 0;
  // The month's almanac runs across the grid after the first six stories; the
  // stories after it may leave empty slots in the last row (always on a short
  // last page, and with an odd count in two columns). A "continued" slip fills them.
  const tail = rest.length > 6 ? rest.length - 6 : rest.length;
  const gaps = { two: tail % 2, three: (3 - (tail % 3)) % 3 };

  const story = (article: FeedArticle, index: number, variant?: StoryVariant) => (
    <ArticleCard
      article={article}
      userId={userId}
      onHide={userId ? handleHide : undefined}
      onMuteSource={userId ? handleMute : undefined}
      eagerImage={index < 3}
      variant={variant}
    />
  );

  const code = (text: string) => <code className="bg-muted px-1.5 py-0.5 font-mono text-xs not-italic">{text}</code>;

  return (
    <div className="container pt-5 sm:pt-6">
      <FrontMasthead home="/feed" />

      {/* The zones of the page (masthead, lead story, the columns) are parted by engraved scrollwork. */}
      <ScrollDivider className="mt-6" />

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-end gap-3">
          <Engraving name="newsboy" className="hidden h-[4.2rem] sm:inline-block" />
          <div>
            <h1 className="font-display text-[1.7rem] font-semibold italic leading-tight sm:text-3xl">
              <Greeting name={username ?? 'reader'} />
            </h1>
            <p className="mt-1 text-[0.98rem] italic text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Segmented<FeedSort>
            aria-label="Order of the stories"
            variant="ribbon"
            className="self-start sm:self-auto"
            value={filters.sort}
            onChange={(sort) => updateFilters({ sort })}
            options={[
              { value: 'latest', label: 'Latest', title: 'Newest stories first' },
              {
                value: 'for_you',
                label: (
                  <>
                    <Ornament name="nib" className="h-[0.95rem]" /> For you
                  </>
                ),
                title: 'Ranked using your sections and the stories you save',
              },
            ]}
          />
          <FeedSearch value={filters.search} onChange={(search) => updateFilters({ search })} className="sm:w-72" />
        </div>
      </div>

      <div className="mt-5">
        <FeedToolbar
          filters={filters}
          onChange={updateFilters}
          categories={categories}
          sources={sources}
          preferredCategoryIds={preferredCategoryIds}
        />
      </div>

      <div ref={topRef} className="scroll-mt-20" />
      {/* Clipped sideways so a page swinging in (the page turn) never makes the page scroll sideways. */}
      <section className="mt-6 overflow-x-clip" aria-label="Stories" aria-busy={loading}>
        {waiting && articles.length === 0 ? (
          <div className="space-y-6">
            <div className="card-paper flex items-center gap-4 p-5">
              <Spinner className="h-5 w-5" />
              <div>
                <p className="font-display text-lg font-semibold">The presses are running…</p>
                <p className="text-sm italic text-muted-foreground">
                  Today’s stories are being fetched for the first time. This takes about 20 seconds; the page updates by itself.
                </p>
              </div>
            </div>
            <ArticleGridSkeleton />
          </div>
        ) : loading && articles.length === 0 ? (
          <ArticleGridSkeleton />
        ) : isEmpty ? (
          status === 'error' ? (
            <EmptyState
              engraving="press"
              title="The presses jammed"
              description="The paper could not be loaded. Check your connection and try again."
              action={<Button onClick={() => updateFilters({})}>Try again</Button>}
            />
          ) : page > 1 ? (
            <EmptyState
              engraving="kitten-peer"
              title={`There is no page ${page}`}
              description="This edition is shorter than that. New stories may have moved things around."
              action={<Button onClick={() => goToPage(1)}>Back to page 1</Button>}
            />
          ) : databaseEmptyWithoutIngestion ? (
            <EmptyState
              engraving="press"
              title="No stories have been printed yet"
              description={
                <>
                  Run {code('npm run ingest')} in the project folder, or add {code('SUPABASE_SERVICE_ROLE_KEY')} to {code('.env.local')} so
                  the app can fetch news by itself.
                </>
              }
              action={<Button onClick={() => updateFilters({})}>Check again</Button>}
            />
          ) : filters.search ? (
            <EmptyState
              engraving="kitten-peer"
              title={`Nothing in the paper about “${filters.search}”`}
              description="Try different words, a longer time range or more sections."
              action={
                <>
                  <Button variant="outline" onClick={() => updateFilters({ search: '' })}>
                    Clear search
                  </Button>
                  {filters.categoryIds.length > 0 && (
                    <Button onClick={() => updateFilters({ categoryIds: [], sourceIds: [] })}>Search every section</Button>
                  )}
                </>
              }
            />
          ) : (
            <EmptyState
              engraving="kitten-curious"
              title="No stories for these filters"
              description="There is nothing recent here yet. New stories arrive every hour."
              action={
                <>
                  <Button variant="outline" onClick={() => updateFilters({ categoryIds: [], sourceIds: [], range: 'any' })}>
                    Show everything
                  </Button>
                  <Button asChild>
                    <Link href="/onboarding">Edit my sections</Link>
                  </Button>
                </>
              }
            />
          )
        ) : (
          // A new key on each page turn, so the new page swings in once.
          <div
            key={turn?.key ?? 'page'}
            className={cn('transition-opacity', turn && (turn.dir === 'next' ? 'page-turn-next' : 'page-turn-prev'), loading && 'pointer-events-none opacity-50')}
          >
            {page > 1 && (
              <p className="mb-4 flex items-baseline justify-between font-label text-[0.92rem] text-muted-foreground">
                <span className="font-medium text-foreground">Page {page}</span>
                <span>
                  {total.toLocaleString('en-US')} stories · {pages} pages
                </span>
              </p>
            )}

            {/* Page one of the paper: the lead story and "In other news", divided by a column rule. */}
            {lead && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-0">
                <div className="flex lg:pr-9">{story(lead, 0, 'lead')}</div>
                <aside className="flex flex-col border-t border-rule/40 pt-6 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0" aria-labelledby="other-news">
                  <SectionHead id="other-news" engraving="telegraph">
                    In other news
                  </SectionHead>
                  <div className="mt-2 divide-y divide-rule/30">
                    {sidebar.map((article, index) => (
                      <div key={article.id} className="py-4 last:pb-0">
                        {story(article, index + 1, 'compact')}
                      </div>
                    ))}
                  </div>
                  {onThisDay && <OnThisDayCard data={onThisDay} className="mt-6" />}
                </aside>
              </div>
            )}

            {lead && rest.length > 0 && (
              <>
                <ScrollDivider className="mt-12" />
                <SectionHead engraving="press" className="mb-7 mt-6 text-[1.3rem]">
                  Latest dispatches
                </SectionHead>
              </>
            )}

            <div className="news-grid">
              {rest.map((article, index) => (
                <Fragment key={article.id}>
                  {/* The almanac runs across the page after the first two rows. */}
                  {index === 6 && <MonthAlmanac wide className="col-span-full" />}
                  <div>{story(article, index + firstInGrid)}</div>
                </Fragment>
              ))}
              {(gaps.two > 0 || gaps.three > 0) && (
                <GridFiller
                  gaps={gaps}
                  next={isLastPage ? null : page + 1}
                  onTurn={goToPage}
                  hrefFor={(p) => urlFor(filters, p)}
                  showFrontPageLink={isLastPage && page > 1}
                />
              )}
            </div>

            <div className="mt-10 space-y-10">
              <Pagination page={page} pages={pages} onChange={goToPage} hrefFor={(p) => urlFor(filters, p)} disabled={loading} />
              {isLastPage && <EndOfEdition />}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
