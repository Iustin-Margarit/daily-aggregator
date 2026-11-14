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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // No code: Google sign-in cancelled or failed, or an old email link.
  return NextResponse.redirect(`${origin}/login?error=${callbackErrorCode(searchParams)}`);
}
