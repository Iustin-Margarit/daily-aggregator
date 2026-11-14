import 'server-only';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

export type SignInOptions = { google: boolean };

/**
 * Which sign-in methods are switched on in Supabase (Authentication > Sign In / Providers).
 * The "Continue with Google" button is shown only when Google is enabled there, so
 * turning it on or off needs no code change and the button can never lead to an error.
 * Cached for five minutes; if Supabase cannot be reached the button is simply hidden.
 */
export async function getSignInOptions(): Promise<SignInOptions> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { google: false };
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { google: false };
    const settings = (await response.json()) as { external?: Record<string, unknown> };
    return { google: settings.external?.google === true };
  } catch {
    return { google: false };
  }
}
