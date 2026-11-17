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
  // Everything from "The post … appeared first on" on (The Spectator Australia adds "What to read next: …" after it).
  /\s*The post .{1,300}? appeared first on [\s\S]*$/i,
  /\s*(Continue reading|Read more|Read the full story|Keep reading)\s*(\.{3}|…|»|→)?\s*$/i,
  /\s*\[(…|\.\.\.)\]\s*$/,
  /^\s*(Photo|Image):?\s.{0,120}?(Getty Images|AP|Reuters|AFP|Shutterstock)\s*/i,
  // A newsletter plug inside the summary (The Guardian: "Sign up for Guardian Australia's breaking news email").
  /\s*Sign up (for|to) (the |our )?(Guardian|newsletter|email|briefing|breaking news)[^.!?]*([.!?]|$)/gi,
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

/*
 * Headlines that are advertising or gambling, never news, kept off the paper at
 * ingestion (sports feeds in particular carry sportsbook promotions and betting
 * tips as articles; Wired's feed carries coupon pages). Two lists so either can be
 * loosened on its own. Narrow on purpose: a story that only mentions a deal, odds or
 * draft picks stays.
 */
const ADVERT_TITLE = [
  /\b(promo|bonus|coupon|referral|discount) codes?\b/i,
  // Coupon and shopping-deal pages: "Wayfair Coupons: Up to 80% Off", "Headphone Deals (2026)".
  /\bcoupons?\s*:/i,
  /\b\d{1,2}\s?% off\b/i,
  /\bdeals\s*\((19|20)\d\d\)/i,
  /\bdeals? roundup\b/i,
  /\b(best|early|top)\b.*\b(black friday|cyber monday|prime day)\b.*\bdeals?\b/i,
  /\bbonus bets?\b/i,
  /\b(betting|sportsbook|casino) (promos?|bonus(es)?|offers?|apps?)\b/i,
  /\bsportsbooks?\b/i,
  /^\s*(sponsored|advertisement|advertorial|paid post|partner content)\b/i,
];
const BETTING_TITLE = [
  /\bparlays?\b/i,
  /\bbest bets\b/i,
  /\bplayer props\b/i,
  /\bagainst the spread\b/i,
  /\bbetting (guide|preview|lines|picks|tips)\b/i,
  /\bodds\b.*\b(picks?|predictions?|spreads?|lines)\b/i,
  /\b(picks?|predictions?)\b.*\bodds\b/i,
  // "Week 11 early odds: Bills favored by 16.5"
  /\b(early|opening|latest|updated) odds\b/i,
  /\bodds\s*:/i,
  // Fantasy-team tips: "Top daily Fantasy picks", "Fantasy Football Week 11 Injury Report", "NFL DFS".
  /\bfantasy (football|basketball|baseball|hockey|picks|rankings|lineups?)\b/i,
  /\b(dfs|daily fantasy)\b/i,
];

/** Game picks ("Rockets vs. Heat NBA picks:", "College basketball picks, schedule"), not draft picks or "picks up". */
function isGamePicks(title: string): boolean {
  return /\bpicks\b(?!\s+up\b)/i.test(title) && /\b(vs\.?|v\.|week \d+|predictions?|schedule|tonight|today)\b/i.test(title) && !/\bdraft\b/i.test(title);
}

/**
 * A sponsored newsletter sent through a news feed (The Hill's: a news-like headline over "Presented by EQT …
 * {beacon} …"): the summary starts with its sponsor, or carries the newsletter's tracking placeholder.
 */
function isSponsoredNewsletter(summaryHtml: string | null): boolean {
  if (!summaryHtml) return false;
  return /\{beacon\}/i.test(summaryHtml) || /^presented by\b/i.test(cleanText(summaryHtml));
}

/** True when a headline is an advert or a betting tip rather than news. */
export function isAdvertTitle(title: string): boolean {
  return ADVERT_TITLE.some((pattern) => pattern.test(title)) || BETTING_TITLE.some((pattern) => pattern.test(title)) || isGamePicks(title);
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
  if (title.length < 3 || isAdvertTitle(title) || isSponsoredNewsletter(item.summaryHtml)) return null;

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

/**
 * A headline reduced to its words, to spot the same story a paper published
 * twice under two addresses (a reworded URL, a "-best-bets" suffix).
 */
export function titleKey(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** How far back the same headline from the same paper counts as a repeat. */
export const REPEAT_WINDOW_HOURS = 48;

/**
 * Drops the paper's repeats: a later item with the headline of an earlier one
 * in the same feed, or of a story the paper already printed recently
 * (`recentTitles`). Order is kept, so put the newest items first.
 */
export function dropRepeatedTitles<T extends { title: string }>(articles: T[], recentTitles: Iterable<string>): T[] {
  const seen = new Set<string>();
  for (const title of recentTitles) seen.add(titleKey(title));
  return articles.filter((article) => {
    const key = titleKey(article.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The date given to items a feed does not date. Otherwise the database would
 * print them as "just now" every time a paper is first read. They appeared
 * after the paper's previous successful check, so that time is used; on its
 * very first check the oldest dated item of the feed (a new paper's undated
 * backlog then sinks below its fresh news). Null: no better guess than now.
 */
export function undatedFallback(articles: { published_at: string | null }[], lastSuccessAt: string | null): string | null {
  if (lastSuccessAt) return lastSuccessAt;
  const dated = articles.map((article) => article.published_at).filter((date): date is string => date !== null);
  return dated.length > 0 ? dated.reduce((oldest, date) => (date < oldest ? date : oldest)) : null;
}
