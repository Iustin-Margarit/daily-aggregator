import type { NextRequest } from 'next/server';

/** Public origin of the request (respects proxies such as Vercel). */
export function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  // Only a plain host name (with an optional port) is accepted from the proxy header.
  if (forwardedHost && process.env.NODE_ENV !== 'development' && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(forwardedHost)) {
    const protocol = request.headers.get('x-forwarded-proto') === 'http' ? 'http' : 'https';
    return `${protocol}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}
