import { decodeEntities } from '@/lib/text';
import { improveImageUrl, normalizeUrl } from '@/lib/ingestion/normalize';
import { safeFetch } from '@/lib/ingestion/safe-fetch';

const USER_AGENT = 'Mozilla/5.0 (compatible; PersonalNewsAggregator/2.0; link preview)';
/** Big enough for the heaviest news pages seen (about 2 MB); the story text comes before most of the rest. */
const MAX_HTML_BYTES = 3_000_000;

/** Words per minute for a grown-up reading the news at an easy pace. */
const WORDS_PER_MINUTE = 230;
/** Below this the page is a video, a gallery, a teaser or a wall; we do not guess. */
const MIN_STORY_WORDS = 150;

const META_PATTERNS = [
  /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["']/i,
];

/** Reads at most MAX_HTML_BYTES of a page. */
async function readPage(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytes = 0;
  try {
    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return html;
}

/**
 * Words of story text on an article page: the paragraphs inside its <article>
 * (or the whole page when there is none), without scripts, menus, headers,
 * footers and asides, and without short lines such as captions and buttons.
 */
export function countStoryWords(html: string): number {
  const cleaned = html.replace(/<(script|style|noscript|svg|header|footer|nav|aside|form|figure)\b[\s\S]*?<\/\1>/gi, ' ');
  const scope = /<article\b[\s\S]*<\/article>/i.exec(cleaned)?.[0] ?? cleaned;
  let total = 0;
  for (const match of scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const words = match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .split(/\s+/)
      .filter((word) => /\p{L}/u.test(word)).length;
    if (words >= 8) total += words;
  }
  return total;
}

/** Minutes to read a story of this many words; 0 when there is too little text to tell. */
export function readingMinutesFor(words: number): number {
  if (words < MIN_STORY_WORDS) return 0;
  return Math.min(600, Math.max(1, Math.round(words / WORDS_PER_MINUTE)));
}

export type PageFacts = {
  /** The og:image / twitter:image, or null. */
  image: string | null;
  /** Minutes to read the story; 0 when the page could not be read or is not a story. */
  readingMinutes: number;
};

/** Reads an article page once for its preview image and the length of its story. */
export async function inspectPage(pageUrl: string, timeoutMs = 8000): Promise<PageFacts> {
  try {
    const { response, finalUrl } = await safeFetch(pageUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) {
      await response.body?.cancel().catch(() => {});
      return { image: null, readingMinutes: 0 };
    }
    const html = await readPage(response);
    let image: string | null = null;
    for (const pattern of META_PATTERNS) {
      const match = pattern.exec(html)?.[1];
      if (match) {
        image = improveImageUrl(normalizeUrl(decodeEntities(match), finalUrl));
        break;
      }
    }
    return { image, readingMinutes: readingMinutesFor(countStoryWords(html)) };
  } catch {
    return { image: null, readingMinutes: 0 };
  }
}
