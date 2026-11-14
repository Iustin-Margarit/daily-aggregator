import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { buildContentSecurityPolicy, createNonce } from '@/lib/security-headers';

/** Pages only for logged-out visitors. Logged-in users are sent to the feed. */
const GUEST_ONLY = new Set(['/login', '/signup', '/forgot-password']);

/**
 * Sections that need a session. Everything else is public: visitors can read
 * the paper, choose sections and clip stories in their browser (/feed,
 * /onboarding, /saved) without an account. Each of these pages also checks
 * the session itself; this redirect only adds the `?next=` return path.
 */
const PRIVATE_SECTIONS = ['/profile', '/admin'];

function isPrivatePath(pathname: string) {
  return PRIVATE_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));
}

export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // API routes authenticate themselves (cron secret, admin checks, ...) and return JSON.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

  // A fresh nonce per request. Next.js reads the policy from the *request*
  // headers to stamp its own scripts; the browser enforces the *response* header.
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    supabaseUrl: SUPABASE_URL,
    isDevelopment: process.env.NODE_ENV === 'development',
    isHttps,
  });
  request.headers.set('x-nonce', nonce);
  request.headers.set('content-security-policy', policy);
  const withPolicy = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', policy);
    return response;
  };

  // First run without a .env.local: show setup instructions instead of crashing.
  if (!isSupabaseConfigured()) {
    if (pathname === '/setup') return withPolicy(NextResponse.next({ request }));
    const url = request.nextUrl.clone();
    url.pathname = '/setup';
    url.search = '';
    return withPolicy(NextResponse.rewrite(url, { request }));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Session cookies are only ever sent over HTTPS when the site uses it.
    cookieOptions: { secure: isHttps },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes
  // an expired session and verifies the JWT.
  // If Supabase cannot be reached, carry on as a visitor rather than fail the request.
  let isLoggedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    isLoggedIn = Boolean(data?.claims?.sub);
  } catch (error) {
    console.error('[proxy] could not check the session:', error);
  }

  const redirect = (path: string) => {
    const url = request.nextUrl.clone();
    const [targetPath, targetQuery] = path.split('?');
    url.pathname = targetPath;
    url.search = targetQuery ? `?${targetQuery}` : '';
    const redirectResponse = NextResponse.redirect(url);
    // Keep any refreshed auth cookies.
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    return redirectResponse;
  };

  if (isLoggedIn && (GUEST_ONLY.has(pathname) || pathname === '/')) {
    return redirect('/feed');
  }

  if (!isLoggedIn && isPrivatePath(pathname)) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return redirect(`/login?next=${next}`);
  }

  return withPolicy(response);
}
