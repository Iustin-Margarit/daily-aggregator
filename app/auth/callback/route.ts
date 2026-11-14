import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/app/auth/request-origin';
import { callbackErrorCode } from '@/lib/auth';
import { safeNextPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';

/**
 * PKCE flow: Supabase redirects here with ?code=... after "Continue with Google"
 * and after a confirmation / password-reset link from the default email templates.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

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
  if (next !== '/feed' || !userId) return next;
  const { data: profile } = await supabase.from('profiles').select('has_completed_onboarding').eq('id', userId).maybeSingle();
  return profile && !profile.has_completed_onboarding ? '/onboarding' : next;
}
