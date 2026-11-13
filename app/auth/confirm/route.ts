import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/app/auth/request-origin';
import { safeNextPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';

const TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'email_change', 'invite', 'magiclink'];

/**
 * token_hash flow used by the templates in supabase/templates. Works even when
 * the link is opened in a different browser than the one that requested it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNextPath(searchParams.get('next'));

  if (!tokenHash || !type || !TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/email-confirmed?error=invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    // Only a code goes into the URL; the page shows its own wording for it.
    return NextResponse.redirect(`${origin}/email-confirmed?error=${error.code === 'otp_expired' ? 'expired' : 'invalid'}`);
  }

  if (type === 'email_change') return NextResponse.redirect(`${origin}/email-confirmed?type=email_change`);
  return NextResponse.redirect(`${origin}${next}`);
}
