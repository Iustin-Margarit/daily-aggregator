import type { Category, DateRange, FeedFilters, FeedSort } from '@/lib/types';

/**
 * Stories per page, so every page ends on full rows of three columns:
 * the front page (page 1 of the plain Latest view) has the lead story,
 * three under "In other news" and four rows of three; every other page has
 * five rows of three.
 */
export const FRONT_PAGE_SIZE = 16;
export const FEED_PAGE_SIZE = 15;

/** True when page 1 is laid out as a front page (lead story and sidebar): Latest, without a search. */
export function hasFrontPage(filters: Pick<FeedFilters, 'sort' | 'search'>): boolean {
  return filters.sort === 'latest' && !filters.search;
}

/** Limit and offset of one page (1-based). */
export function pageWindow(page: number, front: boolean): { limit: number; offset: number } {
  const p = Math.max(1, page);
  if (!front) return { limit: FEED_PAGE_SIZE, offset: (p - 1) * FEED_PAGE_SIZE };
  if (p === 1) return { limit: FRONT_PAGE_SIZE, offset: 0 };
  return { limit: FEED_PAGE_SIZE, offset: FRONT_PAGE_SIZE + (p - 2) * FEED_PAGE_SIZE };
}

const RANGES: DateRange[] = ['any', 'today', 'week'];
const SORTS: FeedSort[] = ['latest', 'for_you'];

/** Oldest published_at for a date range, or undefined for the default 30-day window. */
export function sinceFor(range: DateRange, asOf: string): string | undefined {
  const base = Date.parse(asOf);
  if (range === 'today') return new Date(base - 24 * 3600_000).toISOString();
  if (range === 'week') return new Date(base - 7 * 24 * 3600_000).toISOString();
  return undefined;
}

/** Arguments for the get_feed RPC for one page (1-based). Empty filters are omitted (= no filter). */
export function feedRpcArgs(filters: FeedFilters, page: number, asOf: string) {
  return {
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : undefined,
    p_source_ids: filters.sourceIds.length ? filters.sourceIds : undefined,
    p_search: filters.search || undefined,
    p_since: sinceFor(filters.range, asOf),
    p_sort: filters.sort,
    p_limit: pageWindow(page, hasFrontPage(filters)).limit,
    p_offset: pageWindow(page, hasFrontPage(filters)).offset,
    p_as_of: asOf,
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Page number from ?page=N (1 when missing or invalid). */
export function pageFromSearchParams(params: SearchParams): number {
  const page = Number.parseInt(first(params.page) ?? '', 10);
  return Number.isFinite(page) && page > 1 ? Math.min(page, 1000) : 1;
}

/** Number of pages for a total story count (at least 1). */
export function pageCount(total: number, front: boolean): number {
  if (!front) return Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
  return total <= FRONT_PAGE_SIZE ? 1 : 1 + Math.ceil((total - FRONT_PAGE_SIZE) / FEED_PAGE_SIZE);
}

/**
 * Filters from the URL. Topics use readable names (?topics=technology,science);
 * no `topics` param means "my topics".
 */
export function filtersFromSearchParams(
  params: SearchParams,
  categories: Category[],
  preferredCategoryIds: string[],
): FeedFilters {
  const topics = first(params.topics);
  let categoryIds = preferredCategoryIds;
  if (topics === 'all') {
    categoryIds = [];
  } else if (topics) {
    const names = topics.toLowerCase().split(',');
    categoryIds = categories.filter((c) => names.includes(c.name.toLowerCase())).map((c) => c.id);
  }

  const range = first(params.range) as DateRange | undefined;
  const sort = first(params.sort) as FeedSort | undefined;
  const sources = first(params.sources);

  return {
    categoryIds,
    sourceIds: sources ? sources.split(',').filter(Boolean) : [],
    search: (first(params.q) ?? '').trim().slice(0, 100),
    range: range && RANGES.includes(range) ? range : 'any',
    sort: sort && SORTS.includes(sort) ? sort : 'latest',
  };
}

export function filtersToQueryString(
  filters: FeedFilters,
  categories: Category[],
  preferredCategoryIds: string[],
  page = 1,
): string {
  const params = new URLSearchParams();
  const sameAsPreferred =
    filters.categoryIds.length === preferredCategoryIds.length &&
    filters.categoryIds.every((id) => preferredCategoryIds.includes(id));

  if (!sameAsPreferred) {
    params.set(
      'topics',
      filters.categoryIds.length === 0
        ? 'all'
        : categories
            .filter((c) => filters.categoryIds.includes(c.id))
            .map((c) => c.name.toLowerCase())
            .join(','),
    );
  }
  if (filters.sourceIds.length) params.set('sources', filters.sourceIds.join(','));
  if (filters.search) params.set('q', filters.search);
  if (filters.range !== 'any') params.set('range', filters.range);
  if (filters.sort !== 'latest') params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `?${query.replace(/%2C/gi, ',')}` : '';
}
