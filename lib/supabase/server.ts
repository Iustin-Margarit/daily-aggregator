import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

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
 * The verified current user (or null), memoised for the duration of a request
 * so layouts and pages can both ask for it without extra round trips.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's profile row (or null), memoised per request. */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
});
