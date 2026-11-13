/**
 * Content-Security-Policy for every page, built in the proxy (proxy.ts).
 * Only Web APIs are used here, so it runs in any runtime.
 *
 * Scripts are allowed only when they carry this request's random nonce;
 * Next.js adds the nonce to its own scripts automatically. An injected
 * <script> or inline event handler therefore does not run, even if some future
 * change accidentally rendered untrusted HTML.
 */

export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes));
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(options: {
  nonce: string;
  /** Supabase project URL: the browser talks to it for auth, data and realtime. */
  supabaseUrl: string;
  isDevelopment: boolean;
  isHttps: boolean;
}): string {
  const supabase = originOf(options.supabaseUrl);
  const connect = ["'self'"];
  if (supabase) connect.push(supabase, supabase.replace(/^http/, 'ws'));
  // Hot reload in development uses a websocket to the dev server.
  if (options.isDevelopment) connect.push('ws://localhost:*', 'ws://127.0.0.1:*');

  const directives = [
    "default-src 'self'",
    // 'unsafe-eval' is needed by React's development tooling only.
    `script-src 'self' 'nonce-${options.nonce}' 'strict-dynamic'${options.isDevelopment ? " 'unsafe-eval'" : ''}`,
    // Styles: the app sets colours through style attributes (accent ink, avatars).
    "style-src 'self' 'unsafe-inline'",
    // Story photos come from the publishers' own servers.
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ];
  if (options.isHttps) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
