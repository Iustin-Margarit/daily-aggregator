import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/app/auth/request-origin';
import { callbackErrorCode } from '@/lib/auth';
import { safeNextPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';
import { FRONT_PATH, LOGIN_PATH } from '@/lib/routes';

/**
 * PKCE flow: Supabase redirects here with ?code=... after "Continue with Google"
 * (the only way to sign in since V2.1). The reader goes straight back to the page
 * they were on (?next=), new account or not: there is no onboarding detour.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const code = searchParams.get('code');
  // Old confirmation emails (from before Google-only sign-in) ask for /onboarding; never back to the login page.
  const asked = safeNextPath(searchParams.get('next'));
  const next = /^\/(onboarding|login)(?:[/?#]|$)/.test(asked) ? FRONT_PATH : asked;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // No code: Google sign-in cancelled or failed, or an old email link.
  return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=${callbackErrorCode(searchParams)}`);
}

