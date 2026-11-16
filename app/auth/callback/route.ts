import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/app/auth/request-origin';
import { callbackErrorCode } from '@/lib/auth';
import { safeNextPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';
import { FRONT_PATH, SECTIONS_PATH } from '@/lib/routes';

/**
 * PKCE flow: Supabase redirects here with ?code=... after "Continue with Google"
 * (the only way to sign in since V2.1).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const code = searchParams.get('code');
  // Old confirmation emails (from before Google-only sign-in) ask for /onboarding: the front page instead.
  const asked = safeNextPath(searchParams.get('next'));
  const next = /^\/onboarding(?:[/?#]|$)/.test(asked) ? FRONT_PATH : asked;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${await landingPath(supabase, data.user?.id, next)}`);
  }

  // No code: Google sign-in cancelled or failed, or an old email link.
  return NextResponse.redirect(`${origin}/login?error=${callbackErrorCode(searchParams)}`);
}

/**
 * A new account (Google creates one on the first sign-in) is shown Sections once,
 * right after signing in. Only here: the feed itself never sends anyone back to it,
 * so a reader who would rather look around first is never forced through it.
 * A reader on their way to a particular page (?next=) goes there instead.
 */
async function landingPath(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | undefined, next: string) {
  if (next !== FRONT_PATH || !userId) return next;
  const { data: profile } = await supabase.from('profiles').select('has_completed_onboarding').eq('id', userId).maybeSingle();
  return profile && !profile.has_completed_onboarding ? SECTIONS_PATH : next;
}
