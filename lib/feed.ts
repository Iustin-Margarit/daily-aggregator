import type { GuestMutes } from '@/lib/guest';
import { sectionSlug } from '@/lib/routes';
import type { Category, FeedFilters } from '@/lib/types';

/**
 * Stories per page of a list (the latest, one section), so every page ends on
 * full rows of three columns: page 1 has the lead story, three under "In other
 * news" and four rows of three; every other page has five rows of three.
 * The front page is not a list: it is a digest (lib/front-page.ts).
 */
export const FIRST_PAGE_SIZE = 16;
export const FEED_PAGE_SIZE = 15;

/** True when page 1 is laid out with a lead story and a sidebar: every list but a search. */
export function hasLeadPage(filters: Pick<FeedFilters, 'search'>): boolean {
  return !filters.search;
}

/** Limit and offset of one page (1-based). */
export function pageWindow(page: number, lead: boolean): { limit: number; offset: number } {
  const p = Math.max(1, page);
  if (!lead) return { limit: FEED_PAGE_SIZE, offset: (p - 1) * FEED_PAGE_SIZE };
  if (p === 1) return { limit: FIRST_PAGE_SIZE, offset: 0 };
  return { limit: FEED_PAGE_SIZE, offset: FIRST_PAGE_SIZE + (p - 2) * FEED_PAGE_SIZE };
}

/**
 * Arguments for the get_feed RPC for one page (1-based). No sections = every section.
 * `mutes`: a visitor's muted newspapers and words (signed-in readers' lists are in the database).
 */
export function feedRpcArgs(filters: FeedFilters, page: number, asOf: string, mutes?: GuestMutes) {
  const { limit, offset } = pageWindow(page, hasLeadPage(filters));
  return {
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : undefined,
    p_source_ids: filters.sourceIds?.length ? filters.sourceIds : undefined,
    p_search: filters.search || undefined,
    p_limit: limit,
    p_offset: offset,
    p_as_of: asOf,
    ...mutedArgs(mutes),
    ...hiddenArgs(mutes),
  };
}

/** get_feed's and get_front_page's argument for a visitor's hidden stories (omitted when there are none). */
export function hiddenArgs(mutes?: GuestMutes) {
  return { p_hidden_ids: mutes?.hiddenIds.length ? mutes.hiddenIds : undefined };
}

/** The feed functions' arguments for a visitor's muted newspapers and words (omitted when there are none). */
export function mutedArgs(mutes?: GuestMutes) {
  return {
    p_muted_source_ids: mutes?.sourceIds.length ? mutes.sourceIds : undefined,
    p_muted_words: mutes?.words.length ? mutes.words : undefined,
  };
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Page number from ?page=N (1 when missing or invalid). */
export function pageFromSearchParams(params: SearchParams): number {
  const page = Number.parseInt(firstParam(params.page) ?? '', 10);
  return Number.isFinite(page) && page > 1 ? Math.min(page, 1000) : 1;
}

/** The words of a search (?q=), trimmed and at most 100 characters. */
export function searchFromParams(params: SearchParams): string {
  return (firstParam(params.q) ?? '').trim().slice(0, 100);
}

/** Number of pages for a total story count (at least 1). */
export function pageCount(total: number, lead: boolean): number {
  if (!lead) return Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
  return total <= FIRST_PAGE_SIZE ? 1 : 1 + Math.ceil((total - FIRST_PAGE_SIZE) / FEED_PAGE_SIZE);
}

/** The section named in an address ("world"), or undefined. */
export function sectionFromSlug(categories: Category[], slug: string): Category | undefined {
  let name: string;
  try {
    name = decodeURIComponent(slug).toLowerCase();
  } catch {
    return undefined;
  }
  return categories.find((c) => sectionSlug(c.name) === name);
}

/**
 * One page of a list: the list's own address and query (`/latest?topics=all`,
 * `/search?q=storm`) with ?page=N added from page 2 on.
 */
export function pageHref(path: string, query: Record<string, string>, page: number): string {
  const params = new URLSearchParams(query);
  if (page > 1) params.set('page', String(page));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

/** The newspapers a list is filtered to (?papers=the-guardian-world,bbc-news-world): their address names, at most 60. */
export function paperSlugsFromParams(params: SearchParams): string[] {
  const value = firstParam(params.papers);
  if (!value) return [];
  return [...new Set(value.toLowerCase().split(',').map((slug) => slug.trim()))].filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug)).slice(0, 60);
}

/** The query again (first value of each key), without the given keys: "?a=1&b=2", or "" when nothing is left. */
export function queryWithout(params: SearchParams, drop: string[]): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const value1 = firstParam(value);
    if (value1 !== undefined && !drop.includes(key)) query.set(key, value1);
  }
  const text = query.toString().replace(/%2C/gi, ',');
  return text ? `?${text}` : '';
}

/** Page numbers around the current one: 1 … 4 5 [6] 7 8 … 31 */
export function visiblePages(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) out.push(p - sorted[index - 1] === 2 ? p - 1 : 'gap');
    out.push(p);
  });
  return out;
}

/** Empty slots in the last row of the story grid, with two and with three columns. */
export function gridGaps(storiesInGrid: number): { two: number; three: number } {
  return { two: storiesInGrid % 2, three: (3 - (storiesInGrid % 3)) % 3 };
}
