import { cleanText, truncate } from '@/lib/text';
import type { ParsedFeedItem } from '@/lib/ingestion/parse-feed';

export type NormalizedArticle = {
  title: string;
  summary: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
};

// Query parameters that only exist for analytics; removing them prevents the
// same story from being stored twice under slightly different URLs.
const TRACKING_PARAM =
  /^(utm_[a-z_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ocid|cmpid|cmp|smid|sr_share|ns_[a-z_]+|at_[a-z_0-9]+|__twitter_impression|_hsenc|_hsmi|mkt_tok|rss_source)$/i;

/** Absolute http(s) URL without tracking parameters or fragment, or null. */
export function normalizeUrl(raw: string | null | undefined, base?: string | null): string | null {
  if (!raw) return null;
  const candidate = raw.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/\s+/g, '');
  if (!candidate) return null;
  try {
    const url = new URL(candidate.startsWith('//') ? `https:${candidate}` : candidate, base ?? undefined);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
    }
    const value = url.toString();
    return value.length <= 2000 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Fixes known feed image quirks:
 *  - BBC and Phys.org only publish 240px thumbnails, but serve larger sizes at predictable URLs.
 *  - Some feeds emit broken placeholders such as ".../undefined".
 *  - NPR links multi-megabyte originals; returning null lets the og:image enrichment pick a web-sized one.
 */
export function improveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/\/(undefined|null)(\?|$)/i.test(url)) return null;
  if (/brightspotcdn\.com\/dims3\/.*\/resize\/(\d{4,})x\d+!/i.test(url)) {
    const width = Number(/\/resize\/(\d+)x/i.exec(url)?.[1]);
    if (width > 2000) return null;
  }
  return url
    .replace(/(ichef\.bbci\.co\.uk\/(?:ace|news)\/(?:standard|ws)\/)\d{2,3}\//i, '$1976/')
    .replace(/(\.b-cdn\.net\/csz\/news\/)tmb\//i, '$1800a/');
}

/** Parses RSS (RFC 822) and Atom (ISO 8601) dates. */
export function parseFeedDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const value = raw.trim();
  let time = Date.parse(value);
  if (Number.isNaN(time)) {
    // "Sat, 10 Oct 2026 07:49:45 Z" and similar variants
    time = Date.parse(value.replace(/\s+Z$/i, ' GMT').replace(/\s+UT$/i, ' GMT'));
  }
  return Number.isNaN(time) ? null : new Date(time);
}

// Boilerplate that WordPress & co. append to feed descriptions.
const BOILERPLATE = [
  /\s*The post .{1,300}? appeared first on .{1,120}?\.?\s*$/i,
  /\s*(Continue reading|Read more|Read the full story|Keep reading)\s*(\.{3}|…|»|→)?\s*$/i,
  /\s*\[(…|\.\.\.)\]\s*$/,
  /^\s*(Photo|Image):?\s.{0,120}?(Getty Images|AP|Reuters|AFP|Shutterstock)\s*/i,
];

function cleanSummary(html: string | null): string {
  let text = cleanText(html);
  for (const pattern of BOILERPLATE) text = text.replace(pattern, '');
  return text.trim();
}

function cleanAuthor(raw: string | null): string | null {
  if (!raw) return null;
  const text = cleanText(raw)
    .replace(/^by\s+/i, '')
    .replace(/\S+@\S+/g, '')
    .replace(/[()]/g, '')
    .trim();
  if (!text || text.length < 2) return null;
  return truncate(text, 100);
}

export type NormalizeOptions = {
  /** Used to resolve relative links. */
  baseUrl?: string | null;
  now?: number;
  /** Items published longer ago than this are skipped. */
  maxAgeDays?: number;
};

export function normalizeItem(item: ParsedFeedItem, options: NormalizeOptions = {}): NormalizedArticle | null {
  const now = options.now ?? Date.now();

  const title = truncate(cleanText(item.title), 300);
  if (title.length < 3) return null;

  const url = normalizeUrl(item.link, options.baseUrl);
  if (!url) return null;

  const published = parseFeedDate(item.published);
  if (published && options.maxAgeDays && now - published.getTime() > options.maxAgeDays * 86_400_000) {
    return null;
  }
  // Future dates (time zone bugs in feeds) are clamped to "now".
  const publishedAt = published ? new Date(Math.min(published.getTime(), now)).toISOString() : null;

  let summary = cleanSummary(item.summaryHtml);
  if (summary.length < 40) {
    const fromContent = cleanSummary(item.contentHtml);
    if (fromContent.length > summary.length) summary = fromContent;
  }
  if (summary.toLowerCase() === title.toLowerCase()) summary = '';

  const image = improveImageUrl(normalizeUrl(item.imageUrl, options.baseUrl));

  return {
    title,
    summary: summary ? truncate(summary, 420) : null,
    url,
    image_url: image,
    author: cleanAuthor(item.author),
    published_at: publishedAt,
  };
}
