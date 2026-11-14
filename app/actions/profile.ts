'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasPasswordLogin, passwordTooLong, signedInRecently } from '@/lib/auth';
import { HEX_COLOR } from '@/lib/colors';
import { createAdminClient } from '@/lib/supabase/admin';
import { getI18n } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult, FontSize } from '@/lib/types';
import { profileSaveError, validateUsername } from '@/lib/validation';

const done = (message: string): ActionResult => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

/** The signed-in user (checked with Supabase, never trusted from the browser) and the reader's edition for the messages. */
async function requireUser() {
  const [supabase, { t }] = await Promise.all([createClient(), getI18n()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user, m: t.actions, t };
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, m, t } = await requireUser();
  if (!user) return fail(m.sessionExpired);

  const username = String(formData.get('username') ?? '').trim();
  const avatarColor = String(formData.get('avatar_color') ?? '');
  const problem = validateUsername(username, t.validation);
  if (problem) return fail(problem);
  if (!HEX_COLOR.test(avatarColor)) return fail(m.validColour);

  const { error } = await supabase.from('profiles').update({ username, avatar_color: avatarColor }).eq('id', user.id);
  if (error) return fail(profileSaveError(error, m.profileFailed, t.validation));

  revalidatePath('/', 'layout');
  return done(m.profileUpdated);
}

const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

export async function updateAppearance(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, m } = await requireUser();
  if (!user) return fail(m.sessionExpired);

  const bannerColor = String(formData.get('banner_color') ?? '');
  const fontSize = String(formData.get('font_size') ?? '') as FontSize;
  if (!HEX_COLOR.test(bannerColor)) return fail(m.validColour);
  if (!FONT_SIZES.includes(fontSize)) return fail(m.pickSize);

  const { error } = await supabase.from('profiles').update({ banner_color: bannerColor, font_size: fontSize }).eq('id', user.id);
  if (error) return fail(m.appearanceFailed);

  (await cookies()).set('font-size', fontSize, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
  return done(m.appearanceSaved);
}

export async function updateEmail(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, m } = await requireUser();
  if (!user) return fail(m.sessionExpired);
  // Google accounts use the address of the Google account; there is no form for it.
  if (!hasPasswordLogin(user.identities)) return fail(m.emailFromGoogle);

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(m.validEmail);
  if (email === user.email?.toLowerCase()) return fail(m.sameEmail);

  const origin = (await headers()).get('origin') ?? '';
  const { error } = await supabase.auth.updateUser(
    { email },
    {
      emailRedirectTo: origin
        ? `${origin}/auth/callback?next=${encodeURIComponent('/email-confirmed?type=email_change')}`
        : undefined,
    },
  );
  if (error) {
    return fail(
      /rate limit/i.test(error.message) ? m.tooMany : m.emailFailed,
    );
  }
  return done(m.checkEmail.replace('{email}', email));
}

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, m } = await requireUser();
  if (!user?.email) return fail(m.sessionExpired);
  if (!hasPasswordLogin(user.identities)) return fail(m.noPassword);

  const current = String(formData.get('current_password') ?? '');
  const next = String(formData.get('new_password') ?? '');
  const confirm = String(formData.get('confirm_password') ?? '');
  if (next.length < 8) return fail(m.passwordShort);
  if (passwordTooLong(next)) return fail(m.passwordLong);
  if (next !== confirm) return fail(m.passwordsDiffer);

  // Re-authenticate so a stolen session alone cannot change the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) return fail(m.currentWrong);

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return fail(
      error.code === 'same_password' ? m.passwordSame : error.code === 'weak_password' ? m.passwordWeak : m.passwordFailed,
    );
  }
  return done(m.passwordChanged);
}

export type DeleteAccountResult = ActionResult & {
  /** Google-only account whose last sign-in is too old: it must confirm with Google first. */
  needsGoogle?: boolean;
};

export async function deleteAccount(password: string | null): Promise<DeleteAccountResult> {
  const { supabase, user, m } = await requireUser();
  if (!user) return fail(m.sessionExpired);

  // Prove it is really the owner, so an unattended, logged-in browser is not enough to delete the account.
  if (hasPasswordLogin(user.identities)) {
    // Accounts with a password: ask for it again.
    if (!user.email) return fail(m.sessionExpired);
    if (typeof password !== 'string' || password.length === 0) return fail(m.enterPassword);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (verifyError) return fail(m.passwordWrong);
  } else {
    // Google-only accounts have no password: they must have signed in with Google in the last few minutes.
    const { data } = await supabase.auth.getClaims();
    if (!signedInRecently(data?.claims?.amr, Math.floor(Date.now() / 1000))) {
      return { ...fail(m.confirmGoogleFirst), needsGoogle: true };
    }
  }

  // The delete itself needs the service-role key, so it cannot be done from the browser without the password check above.
  const admin = createAdminClient();
  if (!admin) return fail(m.cannotDelete);
  const { error } = await admin.rpc('delete_user_account', { p_user_id: user.id });
  if (error) {
    console.error('[account] delete failed:', error.message);
    return fail(error.code === 'P0001' ? error.message : m.deleteFailed);
  }

  await supabase.auth.signOut({ scope: 'local' });
  (await cookies()).delete('font-size');
  redirect('/?account=deleted');
}
