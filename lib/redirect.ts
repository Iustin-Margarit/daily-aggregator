/**
 * Only allow same-site relative paths (prevents open redirects via ?next=).
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), backslashes
 * (which browsers treat as slashes) and control characters such as tabs
 * (which browsers strip, turning "/\t/evil.com" into "//evil.com").
 */
export function safeNextPath(value: string | null | undefined, fallback = '/feed'): string {
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
