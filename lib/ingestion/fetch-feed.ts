import { readLimited, safeFetch, UnsafeUrlError } from '@/lib/ingestion/safe-fetch';

const USER_AGENT = 'Mozilla/5.0 (compatible; PersonalNewsAggregator/2.0; RSS reader)';
const ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5';

export type FetchFeedOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  /** What the feed sent last time: asked back as If-None-Match / If-Modified-Since. */
  validators?: FeedValidators;
};

/** A feed's ETag and Last-Modified headers (null when it sent none). */
export type FeedValidators = { etag: string | null; lastModified: string | null };

export type FetchedFeed =
  | { notModified: true; finalUrl: string }
  | { notModified: false; xml: string; finalUrl: string; validators: FeedValidators };

/** A header value worth keeping: present, short, and plain text (it is sent back as a header). */
function validator(value: string | null): string | null {
  return value && value.length <= 300 && /^[ -~]+$/.test(value) ? value : null;
}

function charsetFromContentType(contentType: string | null): string | null {
  return contentType ? (/charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? null) : null;
}

function charsetFromXmlDeclaration(bytes: Uint8Array): string | null {
  const head = new TextDecoder('ascii').decode(bytes.slice(0, 300));
  return /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1] ?? null;
}

function decode(bytes: Uint8Array, contentType: string | null): string {
  const label = charsetFromContentType(contentType) ?? charsetFromXmlDeclaration(bytes) ?? 'utf-8';
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Downloads a feed, respecting a timeout, a size limit and the declared charset.
 * With validators, a feed that has not changed answers 304 and nothing is downloaded.
 */
export async function fetchFeed(url: string, options: FetchFeedOptions = {}): Promise<FetchedFeed> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? 5_000_000;

  let response: Response;
  let finalUrl: string;
  try {
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT, Accept: ACCEPT };
    const etag = validator(options.validators?.etag ?? null);
    const lastModified = validator(options.validators?.lastModified ?? null);
    if (etag) headers['If-None-Match'] = etag;
    if (lastModified) headers['If-Modified-Since'] = lastModified;
    ({ response, finalUrl } = await safeFetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    }));
  } catch (error) {
    if (error instanceof UnsafeUrlError) throw new Error(error.message);
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)} s`);
    }
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
    throw new Error(`Network error${cause ? `: ${cause}` : ''}`);
  }

  if (response.status === 304) {
    await response.body?.cancel().catch(() => {});
    return { notModified: true, finalUrl };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (declaredLength > maxBytes) {
    throw new Error(`Feed is too large (${Math.round(declaredLength / 1_000_000)} MB)`);
  }

  // Read with a hard cap: a feed without a Content-Length must not fill the memory.
  const bytes = await readLimited(response, maxBytes);
  if (!bytes) {
    throw new Error(`Feed is too large (more than ${Math.round(maxBytes / 1_000_000)} MB)`);
  }

  return {
    notModified: false,
    xml: decode(bytes, response.headers.get('content-type')),
    finalUrl,
    validators: { etag: validator(response.headers.get('etag')), lastModified: validator(response.headers.get('last-modified')) },
  };
}
