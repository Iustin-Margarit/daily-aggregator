/**
 * Small, pure helpers for the sign-in flows. No Supabase client in here, so they
 * can be unit-tested (tests/auth.test.ts).
 */

/** How recently a reader must have signed in (with Google) to delete their account. */
export const RECENT_SIGN_IN_SECONDS = 10 * 60;

/**
 * True when the session's latest sign-in (the `amr` claim of the access token) is at
 * most `maxAgeSeconds` old. The timestamps stay the same when the token is refreshed,
 * so this tells when the person last actually proved who they are.
 */
export function signedInRecently(
  amr: ({ method: string; timestamp: number } | string)[] | null | undefined,
  nowSeconds: number,
  maxAgeSeconds = RECENT_SIGN_IN_SECONDS,
): boolean {
  const latest = Math.max(0, ...(amr ?? []).map((entry) => (typeof entry === 'object' ? entry.timestamp : 0)));
  return latest > 0 && nowSeconds - latest <= maxAgeSeconds && latest <= nowSeconds + 60;
}

/**
 * The /login?error= code for a failed /auth/callback visit. Supabase sends
 * `error_code=otp_expired` for an old email link; any other error (for example the
 * person pressed "Cancel" on Google's page) gets the general "did not finish" text.
 */
export function callbackErrorCode(params: URLSearchParams): 'link_invalid' | 'sign_in_failed' {
  if (params.get('error_code') === 'otp_expired') return 'link_invalid';
  return params.has('error') ? 'sign_in_failed' : 'link_invalid';
}
