import { decodeEntities } from '@/lib/text';
import { improveImageUrl, normalizeUrl } from '@/lib/ingestion/normalize';
import { safeFetch } from '@/lib/ingestion/safe-fetch';

const USER_AGENT = 'Mozilla/5.0 (compatible; PersonalNewsAggregator/2.0; link preview)';
const MAX_HTML_BYTES = 256_000;

const META_PATTERNS = [
  /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["']/i,
];

/** Reads at most MAX_HTML_BYTES of a page; the <head> is all we need. */
async function readHead(response: Response): Promise<string> {
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
      if (/<\/head>/i.test(html)) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return html;
}

/** Returns the og:image / twitter:image of an article page, or null. */
export async function findPreviewImage(pageUrl: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const { response, finalUrl } = await safeFetch(pageUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) return null;
    const html = await readHead(response);
    for (const pattern of META_PATTERNS) {
      const match = pattern.exec(html)?.[1];
      if (match) return improveImageUrl(normalizeUrl(decodeEntities(match), finalUrl));
    }
    return null;
  } catch {
    return null;
  }
}
