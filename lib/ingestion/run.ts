import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import { canResizeImage } from '@/lib/images';
import { inspectPage } from '@/lib/ingestion/enrich';
import { probeImageSize } from '@/lib/ingestion/image-size';
import { isResting, RETRY_FAILING_HOURS } from '@/lib/ingestion/backoff';
import { effectiveRetention } from '@/lib/ingestion/retention';
import { fetchFeed } from '@/lib/ingestion/fetch-feed';
import { dropRepeatedTitles, normalizeItem, REPEAT_WINDOW_HOURS, undatedFallback, type NormalizedArticle } from '@/lib/ingestion/normalize';
import { parseFeed } from '@/lib/ingestion/parse-feed';

export type IngestionTrigger = 'cron' | 'admin' | 'auto' | 'cli';

export type SourceResult = {
  sourceId: string;
  name: string;
  ok: boolean;
  found: number;
  inserted: number;
  error?: string;
  /** The feed answered 304 Not Modified: nothing new since the last run. */
  unchanged?: boolean;
  /** Not fetched this time: it has failed too often in a row and is only retried now and then. */
  resting?: boolean;
  durationMs: number;
};

type NewArticle = { id: string; url: string; image_url: string | null };

type InternalSourceResult = SourceResult & {
  /** Articles inserted by this run (used for the image checks). */
  newArticles: NewArticle[];
};

/** Images wider than this are replaced (they make scrolling janky). */
const MAX_IMAGE_WIDTH = 2500;

type IngestSource = {
  id: string;
  name: string;
  rss_url: string;
  website_url: string | null;
  consecutive_failures: number;
  last_fetched_at: string | null;
  last_success_at: string | null;
  etag: string | null;
  last_modified: string | null;
};

export type IngestionSummary = {
  status: 'skipped' | 'success' | 'partial' | 'failed';
  skippedReason?: string;
  runId?: string;
  sources: SourceResult[];
  itemsFound: number;
  inserted: number;
  deleted: number;
  /** Days of news kept by this run (fewer than configured while the database is large). */
  retentionDays?: number;
  durationMs: number;
};

export type IngestionOptions = {
  trigger: IngestionTrigger;
  /** Only ingest these sources (default: every enabled source). */
  sourceIds?: string[];
  /** Skip the run if another one started within this many minutes. */
  minIntervalMinutes?: number;
  concurrency?: number;
  retentionDays?: number;
  /** Items kept per source per run (newest first). */
  maxItemsPerSource?: number;
  /** Max new articles per run whose page is read (photo fixes and reading time). */
  maxPageLookups?: number;
  /** Older articles (last 3 days) without a reading time that are measured per run. */
  maxBackfill?: number;
  /** Time for reading article pages; lookups not started by then wait for the next run. */
  pageBudgetMs?: number;
  /**
   * Time for the whole run, so it ends inside the host's limit for one request
   * (Vercel stops functions at 60 s): page reads stop early when the feeds were
   * slow. Default 45 s, except for the command line (no limit).
   */
  timeBudgetMs?: number;
  log?: (message: string) => void;
};

type ServiceClient = SupabaseClient<Database>;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 300 ? `${message.slice(0, 297)}…` : message;
}

function readFeed(xml: string, finalUrl: string, options: { maxAgeDays?: number }) {
  const feed = parseFeed(xml);
  const articles = feed.items
    .map((item) => normalizeItem(item, { baseUrl: feed.link ?? finalUrl, maxAgeDays: options.maxAgeDays }))
    .filter((article): article is NormalizedArticle => article !== null);
  return { title: feed.title, link: feed.link, itemCount: feed.items.length, articles, finalUrl };
}

/** Fetches and parses one feed without touching the database (used by "Test feed"). */
export async function previewFeed(url: string, options: { maxAgeDays?: number } = {}) {
  const fetched = await fetchFeed(url);
  if (fetched.notModified) throw new Error('The feed answered "not modified" to a plain request');
  return readFeed(fetched.xml, fetched.finalUrl, options);
}

async function ingestSource(
  supabase: ServiceClient,
  source: IngestSource,
  options: Required<Pick<IngestionOptions, 'retentionDays' | 'maxItemsPerSource'>>,
): Promise<InternalSourceResult> {
  const started = Date.now();
  try {
    const fetched = await fetchFeed(source.rss_url, { validators: { etag: source.etag, lastModified: source.last_modified } });
    if (fetched.notModified) {
      // Nothing new since the last download: no parsing, no articles to write.
      const now = new Date().toISOString();
      await supabase
        .from('sources')
        .update({ last_fetched_at: now, last_success_at: now, last_error: null, consecutive_failures: 0 })
        .eq('id', source.id);
      return { sourceId: source.id, name: source.name, ok: true, found: 0, inserted: 0, unchanged: true, durationMs: Date.now() - started, newArticles: [] };
    }
    const preview = readFeed(fetched.xml, fetched.finalUrl, { maxAgeDays: options.retentionDays });

    // De-duplicate within the feed and keep the newest items.
    const unique = new Map<string, NormalizedArticle>();
    for (const article of preview.articles) if (!unique.has(article.url)) unique.set(article.url, article);
    const newestFirst = [...unique.values()].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));

    // The same story under a second address: the paper's headlines of the last two days.
    const { data: recent, error: recentError } = await supabase
      .from('articles')
      .select('title')
      .eq('source_id', source.id)
      .gte('published_at', new Date(Date.now() - REPEAT_WINDOW_HOURS * 3_600_000).toISOString());
    if (recentError) throw new Error(`Database: ${recentError.message}`);
    const batch = dropRepeatedTitles(newestFirst, (recent ?? []).map((row) => row.title)).slice(0, options.maxItemsPerSource);

    // Undated items: not "just now" (normalize.ts, undatedFallback).
    const fallbackDate = undatedFallback(batch, source.last_success_at);
    if (fallbackDate) for (const article of batch) article.published_at ??= fallbackDate;

    let inserted = 0;
    let newArticles: NewArticle[] = [];
    if (batch.length > 0) {
      const { data, error } = await supabase.rpc('ingest_articles', {
        p_source_id: source.id,
        p_articles: batch as unknown as Json,
      });
      if (error) throw new Error(`Database: ${error.message}`);
      const rows = data ?? [];
      inserted = rows.length;
      newArticles = rows.map((row) => ({ id: row.article_id, url: row.article_url, image_url: row.image_url }));
    }

    const now = new Date().toISOString();
    await supabase
      .from('sources')
      .update({
        last_fetched_at: now,
        last_success_at: now,
        last_error: preview.itemCount === 0 ? 'Feed returned no items' : null,
        consecutive_failures: 0,
        last_item_count: preview.itemCount,
        // Kept only now that the stories are in: a failed run must download the feed again.
        etag: fetched.validators.etag,
        last_modified: fetched.validators.lastModified,
      })
      .eq('id', source.id);

    return {
      sourceId: source.id,
      name: source.name,
      ok: true,
      found: batch.length,
      inserted,
      durationMs: Date.now() - started,
      newArticles,
    };
  } catch (error) {
    const message = shortError(error);
    await supabase
      .from('sources')
      .update({
        last_fetched_at: new Date().toISOString(),
        last_error: message,
        consecutive_failures: source.consecutive_failures + 1,
      })
      .eq('id', source.id);

    return {
      sourceId: source.id,
      name: source.name,
      ok: false,
      found: 0,
      inserted: 0,
      error: message,
      durationMs: Date.now() - started,
      newArticles: [],
    };
  }
}

async function isUsableImage(url: string): Promise<boolean> {
  if (canResizeImage(url)) return true;
  const size = await probeImageSize(url);
  return size === null || size.width <= MAX_IMAGE_WIDTH;
}

/**
 * Reads the page of each article once:
 *  - the reading time of the story (articles.reading_minutes; 0 = unknown)
 *  - new articles only (`fixImages`):
 *    - no image in the feed  -> use the article page's og:image
 *    - huge original (e.g. 8000px) on a CDN we cannot resize -> og:image, or no image
 * Lookups not started before the deadline are left for the next run (their
 * reading time stays null, so the backfill picks them up).
 */
async function readPages(supabase: ServiceClient, articles: NewArticle[], options: { fixImages: boolean; deadline: number }) {
  const stats = { measured: 0, timed: 0, added: 0, replaced: 0, removed: 0 };
  await mapWithConcurrency(articles, 8, async (article) => {
    if (Date.now() > options.deadline) return;
    const imageOk =
      !options.fixImages || (article.image_url !== null && (canResizeImage(article.image_url) || (await isUsableImage(article.image_url))));
    const page = await inspectPage(article.url);
    let image = article.image_url;
    if (!imageOk) image = page.image && page.image !== article.image_url && (await isUsableImage(page.image)) ? page.image : null;

    const patch: { reading_minutes: number; image_url?: string | null } = { reading_minutes: page.readingMinutes };
    if (image !== article.image_url) patch.image_url = image;
    const { error } = await supabase.from('articles').update(patch).eq('id', article.id);
    if (error) return;
    stats.measured++;
    if (page.readingMinutes > 0) stats.timed++;
    if (image === article.image_url) return;
    if (!article.image_url) stats.added++;
    else if (image) stats.replaced++;
    else stats.removed++;
  });
  return stats;
}

function skippedSummary(started: number, options: IngestionOptions): IngestionSummary {
  return {
    status: 'skipped',
    skippedReason: options.minIntervalMinutes
      ? 'Another run is in progress or news was refreshed recently.'
      : 'Another ingestion run is already in progress.',
    sources: [],
    itemsFound: 0,
    inserted: 0,
    deleted: 0,
    durationMs: Date.now() - started,
  };
}

/**
 * Takes the ingestion lock (one run at a time, in the database). Returns the new run's id,
 * or null when another run is in progress (or, with minIntervalMinutes, one ran recently).
 * Pass the id to runIngestion as `claimedRunId`, or the run stays "running" until it times out.
 */
export async function claimIngestionRun(supabase: ServiceClient, options: Pick<IngestionOptions, 'trigger' | 'minIntervalMinutes'>) {
  const { data: runId, error } = await supabase.rpc('start_ingestion_run', {
    p_trigger: options.trigger,
    p_min_interval_minutes: options.minIntervalMinutes,
  });
  if (error) throw new Error(`Could not start ingestion: ${error.message}`);
  return runId ?? null;
}

/** For a caller that must answer before the run ends (cron services time out after 30 s). */
export function skippedRun(options: IngestionOptions): IngestionSummary {
  return skippedSummary(Date.now(), options);
}

/**
 * Runs one ingestion pass. Needs a service-role client. Only one run can be
 * active at a time; concurrent calls return { status: 'skipped' }.
 * `claimedRunId`: the lock was already taken with claimIngestionRun.
 */
export async function runIngestion(
  supabase: ServiceClient,
  options: IngestionOptions & { claimedRunId?: string },
): Promise<IngestionSummary> {
  const started = Date.now();
  const log = options.log ?? (() => {});
  const configuredDays = options.retentionDays ?? 30;
  const maxItemsPerSource = options.maxItemsPerSource ?? 50;

  const runId = options.claimedRunId ?? (await claimIngestionRun(supabase, options));
  if (!runId) return skippedSummary(started, options);

  try {
    // Old stories are removed first, so the database cannot keep growing even
    // if a slow run is stopped by the host's time limit before it finishes.
    // Only on full runs, so a single-source refresh stays fast.
    // Near the free plan's size limit the run keeps fewer days (retention.ts); the size is unknown on an error.
    const { data: databaseBytes } = await supabase.rpc('database_size_bytes');
    const retention = effectiveRetention(configuredDays, databaseBytes ?? null);
    const retentionDays = retention.days;
    if (retention.shortened) log(`Database over 300 MB: keeping ${retentionDays} days of news instead of ${configuredDays}.`);

    let deleted = 0;
    if (!options.sourceIds?.length) {
      const { data, error } = await supabase.rpc('cleanup_old_articles', { p_retention_days: retentionDays });
      if (error) log(`Cleanup failed: ${error.message}`);
      deleted = data ?? 0;
    }

    let query = supabase
      .from('sources')
      .select('id, name, rss_url, website_url, consecutive_failures, last_fetched_at, last_success_at, etag, last_modified')
      .eq('is_enabled', true)
      .order('name');
    if (options.sourceIds?.length) query = query.in('id', options.sourceIds);

    const { data: sources, error: sourcesError } = await query;
    if (sourcesError) throw new Error(`Could not load sources: ${sourcesError.message}`);

    log(`Fetching ${sources.length} source(s)…`);
    const timeBudget = options.timeBudgetMs ?? (options.trigger === 'cli' ? Infinity : 45_000);
    // A feed may take up to 15 s (fetch-feed.ts): none is started after this, so the run ends in time.
    const lastFeedStart = started + timeBudget - 15_000;
    const results = await mapWithConcurrency(sources, options.concurrency ?? 6, async (source): Promise<InternalSourceResult> => {
      if (Date.now() > lastFeedStart) {
        // Left for the next run; not counted as a failure of the feed.
        return { sourceId: source.id, name: source.name, ok: true, found: 0, inserted: 0, durationMs: 0, newArticles: [] };
      }
      if (!options.sourceIds?.length && isResting(source)) {
        log(`  … ${source.name}: failed ${source.consecutive_failures} times in a row, retried every ${RETRY_FAILING_HOURS} h`);
        return { sourceId: source.id, name: source.name, ok: true, found: 0, inserted: 0, resting: true, durationMs: 0, newArticles: [] };
      }
      const result = await ingestSource(supabase, source, { retentionDays, maxItemsPerSource });
      log(
        !result.ok
          ? `  ✗ ${result.name}: ${result.error}`
          : result.unchanged
            ? `  = ${result.name}: unchanged since the last run (${result.durationMs} ms)`
            : `  ✓ ${result.name}: ${result.inserted} new / ${result.found} items (${result.durationMs} ms)`,
      );
      return result;
    });

    const fresh = results.flatMap((r) => r.newArticles);
    const deadline = Math.min(Date.now() + (options.pageBudgetMs ?? 25_000), started + timeBudget);
    const toRead = fresh.slice(0, options.maxPageLookups ?? 300);
    if (toRead.length > 0) {
      const pages = await readPages(supabase, toRead, { fixImages: true, deadline });
      log(
        `Pages: read ${pages.measured} of ${fresh.length} new stories, ${pages.timed} with a reading time; images added ${pages.added}, replaced ${pages.replaced} oversized, removed ${pages.removed}.`,
      );
    }

    // Recent stories from earlier runs that have no reading time yet.
    const backfill = options.maxBackfill ?? 60;
    if (backfill > 0 && Date.now() < deadline) {
      const { data: older } = await supabase
        .from('articles')
        .select('id, url, image_url')
        .is('reading_minutes', null)
        .gte('created_at', new Date(Date.now() - 3 * 86_400_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(backfill);
      if (older?.length) {
        const pages = await readPages(supabase, older, { fixImages: false, deadline });
        log(`Reading time: measured ${pages.measured} older stories, ${pages.timed} with a reading time.`);
      }
    }

    const failed = results.filter((r) => !r.ok);
    const status: IngestionSummary['status'] =
      results.length > 0 && failed.length === results.length ? 'failed' : failed.length > 0 ? 'partial' : 'success';

    const summary: IngestionSummary = {
      status,
      runId,
      sources: results.map(({ newArticles: _omit, ...result }) => result),
      itemsFound: results.reduce((sum, r) => sum + r.found, 0),
      inserted: results.reduce((sum, r) => sum + r.inserted, 0),
      deleted,
      retentionDays,
      durationMs: Date.now() - started,
    };

    await supabase
      .from('ingestion_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        sources_total: results.length,
        sources_succeeded: results.length - failed.length,
        sources_failed: failed.length,
        items_found: summary.itemsFound,
        articles_inserted: summary.inserted,
        articles_deleted: deleted,
        errors: failed.map((r) => ({ source: r.name, error: r.error ?? 'Unknown error' })),
        duration_ms: summary.durationMs,
      })
      .eq('id', runId);

    return summary;
  } catch (error) {
    await supabase
      .from('ingestion_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        errors: [{ source: null, error: shortError(error) }],
        duration_ms: Date.now() - started,
      })
      .eq('id', runId);
    throw error;
  }
}
