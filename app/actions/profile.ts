'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasPasswordLogin, passwordTooLong, signedInRecently } from '@/lib/auth';
import { HEX_COLOR } from '@/lib/colors';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult, FontSize } from '@/lib/types';
import { profileSaveError, validateUsername } from '@/lib/validation';

const done = (message: string): ActionResult => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return fail('Your session expired. Please log in again.');

  const username = String(formData.get('username') ?? '').trim();
  const avatarColor = String(formData.get('avatar_color') ?? '');
  const problem = validateUsername(username);
  if (problem) return fail(problem);
  if (!HEX_COLOR.test(avatarColor)) return fail('Please pick a valid colour.');

  const { error } = await supabase.from('profiles').update({ username, avatar_color: avatarColor }).eq('id', user.id);
  if (error) return fail(profileSaveError(error, 'Could not save your profile.'));

  revalidatePath('/', 'layout');
  return done('Profile updated');
}

const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

export async function updateAppearance(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return fail('Your session expired. Please log in again.');

  const bannerColor = String(formData.get('banner_color') ?? '');
  const fontSize = String(formData.get('font_size') ?? '') as FontSize;
  if (!HEX_COLOR.test(bannerColor)) return fail('Please pick a valid colour.');
  if (!FONT_SIZES.includes(fontSize)) return fail('Please pick a font size.');

  const { error } = await supabase.from('profiles').update({ banner_color: bannerColor, font_size: fontSize }).eq('id', user.id);
  if (error) return fail('Could not save your appearance settings.');

  (await cookies()).set('font-size', fontSize, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
  return done('Appearance saved');
}

export async function updateEmail(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return fail('Your session expired. Please log in again.');
  // Google accounts use the address of the Google account; there is no form for it.
  if (!hasPasswordLogin(user.identities)) return fail('Your email address comes from your Google account.');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.');
  if (email === user.email?.toLowerCase()) return fail('That is already your email address.');

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
      /rate limit/i.test(error.message)
        ? 'Too many attempts. Please wait a minute and try again.'
        : 'Could not start the email change. Check the address and try again.',
    );
  }
  return done(`Check ${email} (and your current inbox) for confirmation links.`);
}

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user?.email) return fail('Your session expired. Please log in again.');
  if (!hasPasswordLogin(user.identities)) return fail('You sign in with Google, so this account has no password.');

  const current = String(formData.get('current_password') ?? '');
  const next = String(formData.get('new_password') ?? '');
  const confirm = String(formData.get('confirm_password') ?? '');
  if (next.length < 8) return fail('The new password needs at least 8 characters.');
  if (passwordTooLong(next)) return fail('Passwords can have at most 72 characters.');
  if (next !== confirm) return fail('The new passwords do not match.');

  // Re-authenticate so a stolen session alone cannot change the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) return fail('Your current password is incorrect.');

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return fail(
      error.code === 'same_password'
        ? 'The new password must be different from the current one.'
        : error.code === 'weak_password'
          ? 'That password is too weak. Use at least 8 characters with letters and numbers.'
          : 'Could not change the password. Please try again.',
    );
  }
  return done('Password changed');
}

export type DeleteAccountResult = ActionResult & {
  /** Google-only account whose last sign-in is too old: it must confirm with Google first. */
  needsGoogle?: boolean;
};

export async function deleteAccount(password: string | null): Promise<DeleteAccountResult> {
  const { supabase, user } = await requireUser();
  if (!user) return fail('Your session expired. Please log in again.');

  // Prove it is really the owner, so an unattended, logged-in browser is not enough to delete the account.
  if (hasPasswordLogin(user.identities)) {
    // Accounts with a password: ask for it again.
    if (!user.email) return fail('Your session expired. Please log in again.');
    if (typeof password !== 'string' || password.length === 0) return fail('Please enter your password.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (verifyError) return fail('That password is incorrect.');
  } else {
    // Google-only accounts have no password: they must have signed in with Google in the last few minutes.
    const { data } = await supabase.auth.getClaims();
    if (!signedInRecently(data?.claims?.amr, Math.floor(Date.now() / 1000))) {
      return { ...fail('For your safety, please confirm with Google first. Then you can delete the account.'), needsGoogle: true };
    }
  }

  // The delete itself needs the service-role key, so it cannot be done from the browser without the password check above.
  const admin = createAdminClient();
  if (!admin) return fail('Accounts cannot be deleted right now. Please try again later.');
  const { error } = await admin.rpc('delete_user_account', { p_user_id: user.id });
  if (error) {
    console.error('[account] delete failed:', error.message);
    return fail(error.code === 'P0001' ? error.message : 'Could not delete the account. Please try again.');
  }

  await supabase.auth.signOut({ scope: 'local' });
  (await cookies()).delete('font-size');
  redirect('/?account=deleted');
}
