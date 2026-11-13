import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getServiceRoleKey, SUPABASE_URL } from '@/lib/env';

/**
 * Service-role client that bypasses row level security. Server-only, used for
 * news ingestion. Returns null when no service key is configured.
 */
export function createAdminClient() {
  const key = getServiceRoleKey();
  if (!SUPABASE_URL || !key) return null;

  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
