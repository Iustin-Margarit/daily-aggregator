import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { SESSION_CHECKED, SESSION_USER_EMAIL, SESSION_USER_ID } from '@/lib/supabase/session-headers';

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Session cookies are only ever sent over HTTPS when the site uses it.
    cookieOptions: { secure: requestHeaders.get('x-forwarded-proto') === 'https' },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy (proxy.ts) refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * The verified current user with everything Supabase Auth knows (identities,
 * metadata), memoised per request. It asks Supabase Auth over the network, so
 * only pages that need more than the id and email use it (account settings,
 * admin); everything else uses getSessionUser.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type SessionUser = { id: string; email: string | null };

/**
 * Who is signed in (or null), as the proxy verified it for this request
 * (lib/supabase/session-headers.ts), so a page costs no extra trip to Supabase
 * Auth. Without the proxy's headers it checks the session itself.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const requestHeaders = await headers();
  if (requestHeaders.get(SESSION_CHECKED) === '1') {
    const id = requestHeaders.get(SESSION_USER_ID);
    const email = requestHeaders.get(SESSION_USER_EMAIL);
    return id ? { id, email: email ? decodeURIComponent(email) : null } : null;
  }
  try {
    const { data } = await (await createClient()).auth.getClaims();
    const claims = data?.claims;
    return claims?.sub ? { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null } : null;
  } catch {
    return null;
  }
});

/** The current user's profile row (or null), memoised per request. */
export const getCurrentProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
});
