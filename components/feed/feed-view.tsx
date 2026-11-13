'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Newspaper, SearchX } from 'lucide-react';
import { ArticleCard, type StoryVariant } from '@/components/articles/article-card';
import { ArticleGridSkeleton } from '@/components/articles/article-card-skeleton';
import { hideArticle, muteSource, unhideArticle, unmuteSource } from '@/components/articles/moderation';
import { FeedToolbar } from '@/components/feed/feed-toolbar';
import { Pagination } from '@/components/feed/pagination';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { feedRpcArgs, filtersToQueryString, pageCount } from '@/lib/feed';
import { createClient } from '@/lib/supabase/client';
import type { Category, FeedArticle, FeedFilters, SourceOption } from '@/lib/types';
import { cn } from '@/lib/utils';

type FeedViewProps = {
  userId: string;
  username: string;
  categories: Category[];
  sources: SourceOption[];
  preferredCategoryIds: string[];
  initialFilters: FeedFilters;
  initialPage: number;
  initialArticles: FeedArticle[];
  initialAsOf: string;
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

function Greeting({ name }: { name: string }) {
  const [text, setText] = useState('Welcome back');
  useEffect(() => {
    const hour = new Date().getHours();
    setText(hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
  }, []);
  return (
    <>
      {text}, {name}.
    </>
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
  waitingForFirstIngest,
  databaseEmptyWithoutIngestion = false,
}: FeedViewProps) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [articles, setArticles] = useState(initialArticles);
  const [total, setTotal] = useState(totalOf(initialArticles));
  const [status, setStatus] = useState<Status>('idle');
  const [waiting, setWaiting] = useState(waitingForFirstIngest && initialArticles.length === 0);

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
      void load(filtersRef.current, Number.isFinite(value) && value > 1 ? value : 1, false);
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
  const pages = pageCount(total);
  const isEmpty = articles.length === 0 && !loading;
  const isLastPage = page >= pages;
  // The front page layout (lead story + sidebar) is only for page 1 of the plain "latest" view.
  const frontPage = page === 1 && filters.sort === 'latest' && !filters.search && articles.length >= 6;
  const lead = frontPage ? articles[0] : null;
  // 1 lead + 5 in the sidebar leaves 24 for the grid, which fills 2- and 3-column rows evenly.
  const sidebar = frontPage ? articles.slice(1, 6) : [];
  const rest = frontPage ? articles.slice(6) : articles;

  const story = (article: FeedArticle, index: number, variant?: StoryVariant) => (
    <ArticleCard
      article={article}
      userId={userId}
      onHide={handleHide}
      onMuteSource={handleMute}
      eagerImage={index < 3}
      variant={variant}
    />
  );

  const code = (text: string) => <code className="bg-muted px-1.5 py-0.5 font-mono text-xs not-italic">{text}</code>;

  return (
    <div className="container py-5 sm:py-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="font-display text-xl font-bold italic sm:text-2xl">
          <Greeting name={username} />
        </h1>
        <p className="text-sm italic text-muted-foreground">{subtitle}</p>
      </div>

      <FeedToolbar
        filters={filters}
        onChange={updateFilters}
        categories={categories}
        sources={sources}
        preferredCategoryIds={preferredCategoryIds}
        onRefresh={() => updateFilters({})}
        refreshing={loading}
      />

      <div ref={topRef} className="scroll-mt-4" />
      <section className="mt-6" aria-label="Stories" aria-busy={loading}>
        {waiting && articles.length === 0 ? (
          <div className="space-y-6">
            <div className="paper-box flex items-center gap-4 p-5">
              <Spinner className="h-5 w-5" />
              <div>
                <p className="font-display text-lg font-bold">The presses are running…</p>
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
              icon={AlertTriangle}
              title="The presses jammed"
              description="The paper could not be loaded. Check your connection and try again."
              action={<Button onClick={() => updateFilters({})}>Try again</Button>}
            />
          ) : page > 1 ? (
            <EmptyState
              icon={Newspaper}
              title={`There is no page ${page}`}
              description="This edition is shorter than that. New stories may have moved things around."
              action={<Button onClick={() => goToPage(1)}>Back to page 1</Button>}
            />
          ) : databaseEmptyWithoutIngestion ? (
            <EmptyState
              icon={Newspaper}
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
              icon={SearchX}
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
              icon={Newspaper}
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
          <div className={cn('transition-opacity', loading && 'pointer-events-none opacity-50')}>
            {page > 1 && (
              <div className="rule-thick mb-1 flex items-baseline justify-between pb-1 pt-2">
                <span className="label text-foreground">Page {page}</span>
                <span className="label text-muted-foreground">
                  {total.toLocaleString('en-US')} stories · {pages} pages
                </span>
              </div>
            )}

            {lead && (
              <div className="grid gap-8 pb-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-0">
                <div className="lg:pr-8">{story(lead, 0, 'lead')}</div>
                <aside className="lg:border-l lg:border-rule lg:pl-8" aria-label="In other news">
                  <h2 className="label border-b-2 border-rule pb-1.5 text-foreground">In Other News</h2>
                  <div className="divide-y divide-border">
                    {sidebar.map((article, index) => (
                      <div key={article.id} className="py-4">
                        {story(article, index + 1, 'compact')}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            )}

            {lead && rest.length > 0 && (
              <div className="rule-thick flex items-center justify-center pb-1 pt-2">
                <span className="label text-foreground">More Headlines</span>
              </div>
            )}

            <div className="news-grid">
              {rest.map((article, index) => (
                <div key={article.id}>{story(article, index + (lead ? 6 : 0))}</div>
              ))}
            </div>

            <div className="mt-10 space-y-6">
              {!isLastPage && (
                <p className="text-center">
                  <a
                    href={urlFor(filters, page + 1)}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                      event.preventDefault();
                      goToPage(page + 1);
                    }}
                    className="group inline-flex items-center gap-2 font-display text-xl font-bold italic hover:underline"
                  >
                    Continued on page {page + 1} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </p>
              )}
              <Pagination page={page} pages={pages} onChange={goToPage} hrefFor={(p) => urlFor(filters, p)} disabled={loading} />
              {isLastPage && (
                <div className="text-center">
                  <p className="font-display text-2xl font-bold tracking-[0.4em]">— 30 —</p>
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    That is the end of today’s edition. Fresh stories arrive every hour.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
