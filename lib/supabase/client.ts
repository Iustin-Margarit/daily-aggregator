import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/** Supabase client for Client Components. It is a singleton in the browser. */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Session cookies are only ever sent over HTTPS when the site uses it.
    cookieOptions: { secure: typeof window !== 'undefined' && window.location.protocol === 'https:' },
  });
}
