/**
 * Environment configuration.
 *
 * NEXT_PUBLIC_* values must be read through literal `process.env.NAME`
 * expressions so that Next.js can inline them into the browser bundle.
 * Both the classic Supabase keys (anon / service_role) and the newer key format
 * (publishable / secret) are accepted.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/** Server-only. Needed for news ingestion; never expose it to the browser. */
export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || null;
}

/** Minutes between automatic background refreshes triggered by feed visits. 0 disables them. */
export function getAutoRefreshMinutes(): number {
  const raw = process.env.INGESTION_INTERVAL_MINUTES;
  if (raw === undefined || raw === '') return 60;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 60;
}

/** Days an unsaved article is kept before the cleanup step deletes it. */
export function getRetentionDays(): number {
  const value = Number.parseInt(process.env.ARTICLE_RETENTION_DAYS ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 30;
}
