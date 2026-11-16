import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/app/auth/request-origin';
import { callbackErrorCode } from '@/lib/auth';
import { GUEST_SECTIONS_COOKIE, parseGuestSections } from '@/lib/guest';
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await adoptVisitorSections(supabase, data.user.id);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code: Google sign-in cancelled or failed, or an old email link.
  return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=${callbackErrorCode(searchParams)}`);
}

/**
 * The sections a reader chose as a visitor (the guest-sections cookie) become the account's when the account
 * has none yet (a new account, or one that never chose); an account's own choice is never overwritten. The
 * account is also marked as set up, so the Sections page does not greet it as a first run. Their other visitor
 * settings move on the first page after signing in (components/site/guest-prefs-keeper.tsx, guest-import.tsx).
 * Best effort: a failure here never stops the sign-in.
 */
async function adoptVisitorSections(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  try {
    const jar = await cookies();
    const chosen = parseGuestSections(jar.get(GUEST_SECTIONS_COOKIE)?.value);
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('has_completed_onboarding').eq('id', userId).maybeSingle(),
      supabase.from('user_preferred_categories').select('category_id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    if (chosen.length > 0 && (count ?? 0) === 0) {
      const { error } = await supabase
        .from('user_preferred_categories')
        .upsert(chosen.map((category_id) => ({ user_id: userId, category_id })), { onConflict: 'user_id,category_id', ignoreDuplicates: true });
      if (!error) jar.delete(GUEST_SECTIONS_COOKIE);
    } else if (chosen.length > 0) {
      // The account already has its own sections: they win, and the visitor's cookie is dropped.
      jar.delete(GUEST_SECTIONS_COOKIE);
    }
    if (profile && !profile.has_completed_onboarding) {
      await supabase.from('profiles').update({ has_completed_onboarding: true }).eq('id', userId);
    }
  } catch (error) {
    console.error('[auth] could not adopt the visitor sections:', error instanceof Error ? error.message : error);
  }
}
