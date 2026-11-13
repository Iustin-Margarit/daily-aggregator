import type { Category, DateRange, FeedFilters, FeedSort } from '@/lib/types';

/** Stories per page of the paper. */
export const FEED_PAGE_SIZE = 30;

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
    p_limit: FEED_PAGE_SIZE,
    p_offset: (Math.max(1, page) - 1) * FEED_PAGE_SIZE,
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
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
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
