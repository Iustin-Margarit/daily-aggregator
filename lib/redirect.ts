import { FRONT_PATH } from '@/lib/routes';
/**
 * Only allow same-site relative paths (prevents open redirects via ?next=).
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), backslashes
 * (which browsers treat as slashes) and control characters such as tabs
 * (which browsers strip, turning "/\t/evil.com" into "//evil.com").
 */
export function safeNextPath(value: string | null | undefined, fallback = FRONT_PATH): string {
  if (!value || value.length > 500) return fallback;
  if (!/^\/(?![/\\])[\x21-\x7e]*$/.test(value) || value.includes('\\')) return fallback;
  try {
    // Must still be on the same origin after the browser's own URL parsing.
    if (new URL(value, 'http://same.origin').origin !== 'http://same.origin') return fallback;
  } catch {
    return fallback;
  }
  return value;
}

/**
 * A link out to a publisher's own page: only plain http(s) web addresses, so a
 * feed can never slip a javascript: or data: link onto a story. Null otherwise.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 2000) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
