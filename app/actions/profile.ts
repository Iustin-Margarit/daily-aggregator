'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signedInRecently } from '@/lib/auth';
import { DEFAULT_ACCENT, HEX_COLOR } from '@/lib/colors';
import {
  GUEST_ACCENT_COOKIE,
  GUEST_MUTED_PAPERS_COOKIE,
  GUEST_MUTED_WORDS_COOKIE,
  parseGuestAccent,
  parseGuestMutedPapers,
  parseGuestMutedWords,
} from '@/lib/guest';
import { createAdminClient } from '@/lib/supabase/admin';
import { getI18n } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult, FontSize } from '@/lib/types';
import { profileSaveError, validateUsername } from '@/lib/validation';

const done = (message: string): ActionResult => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

/** The signed-in user (checked with Supabase, never trusted from the browser) and the paper's words for the messages. */
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
  const problem = validateUsername(username, t.validation);
  if (problem) return fail(problem);

  const { error } = await supabase.from('profiles').update({ username }).eq('id', user.id);
  if (error) return fail(profileSaveError(error, m.profileFailed, t.validation));

  revalidatePath('/', 'layout');
  return done(m.profileUpdated);
}

const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

/*
 * Type size and accent ink are saved the moment they are chosen. The page has
 * already changed in the browser (lib/guest-prefs.ts sets the font-size cookie
 * and the ink's variables), so these only write the account and do not
 * re-render anything.
 */

export async function saveFontSize(fontSize: FontSize): Promise<ActionResult> {
  const { supabase, user, m } = await requireUser();
  if (!user) return fail(m.sessionExpired);
  if (!FONT_SIZES.includes(fontSize)) return fail(m.pickSize);

  const { error } = await supabase.from('profiles').update({ font_size: fontSize }).eq('id', user.id);
  if (error) return fail(m.appearanceFailed);
  return done('');
}

export async function saveAccentInk(color: string): Promise<ActionResult> {
  const { supabase, user, m } = await requireUser();
  if (!user) return fail(m.sessionExpired);
  if (typeof color !== 'string' || !HEX_COLOR.test(color)) return fail(m.validColour);

  const { error } = await supabase.from('profiles').update({ banner_color: color.toUpperCase() }).eq('id', user.id);
  if (error) return fail(m.appearanceFailed);
  return done('');
}

/**
 * A visitor who signs in brings what they chose in this browser
 * (components/site/guest-prefs-keeper.tsx): their muted newspapers and words
 * join the account's, and their type size and ink are used if the account
 * still has the defaults (a new account; an account's own choice wins).
 * Everything is checked again here and written as the signed-in reader (RLS).
 */
export async function adoptGuestPreferences(input: {
  fontSize?: string;
  accent?: string;
  mutedPapers?: string[];
  mutedWords?: string[];
}): Promise<{ ok: boolean; moved: number }> {
  const { supabase, user } = await requireUser();
  if (!user || typeof input !== 'object' || input === null) return { ok: false, moved: 0 };

  const papers = parseGuestMutedPapers(Array.isArray(input.mutedPapers) ? input.mutedPapers.join(',') : '');
  const words = parseGuestMutedWords(Array.isArray(input.mutedWords) ? input.mutedWords.join('|') : '');
  let ok = true;

  if (papers.length) {
    const { error } = await supabase
      .from('muted_sources')
      .upsert(papers.map((source_id) => ({ user_id: user.id, source_id })), { onConflict: 'user_id,source_id', ignoreDuplicates: true });
    if (error) ok = false;
  }
  for (const keyword of words) {
    // One by one: the database allows 50 words an account, and a word it refuses must not stop the rest.
    const { error } = await supabase
      .from('muted_keywords')
      .upsert({ user_id: user.id, keyword }, { onConflict: 'user_id,keyword', ignoreDuplicates: true });
    if (error && !/at most|limit/i.test(error.message)) ok = false;
  }

  const { data: profile } = await supabase.from('profiles').select('font_size, banner_color').eq('id', user.id).single();
  const appearance: { font_size?: FontSize; banner_color?: string } = {};
  if (profile?.font_size === 'medium' && FONT_SIZES.includes(input.fontSize as FontSize) && input.fontSize !== 'medium') {
    appearance.font_size = input.fontSize as FontSize;
  }
  const accent = parseGuestAccent(input.accent);
  if (profile && profile.banner_color.toUpperCase() === DEFAULT_ACCENT && accent && accent !== DEFAULT_ACCENT) {
    appearance.banner_color = accent;
  }
  if (Object.keys(appearance).length) {
    const { error } = await supabase.from('profiles').update(appearance).eq('id', user.id);
    if (error) ok = false;
  }

  const jar = await cookies();
  for (const name of [GUEST_MUTED_PAPERS_COOKIE, GUEST_MUTED_WORDS_COOKIE, GUEST_ACCENT_COOKIE]) jar.delete(name);
  if (papers.length || words.length || Object.keys(appearance).length) revalidatePath('/', 'layout');
  return { ok, moved: papers.length + words.length };
}

export type DeleteAccountResult = ActionResult & {
  /** The last sign-in is too old: confirm with Google first. */
  needsGoogle?: boolean;
};

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { supabase, user, m } = await requireUser();
  if (!user) return fail(m.sessionExpired);

  // Prove it is really the owner, so an unattended, logged-in browser is not enough to delete the account:
  // they must have signed in with Google in the last few minutes (accounts sign in only with Google).
  const { data } = await supabase.auth.getClaims();
  if (!signedInRecently(data?.claims?.amr, Math.floor(Date.now() / 1000))) {
    return { ...fail(m.confirmGoogleFirst), needsGoogle: true };
  }

  // The delete itself needs the service-role key, so it cannot be done from the browser without the check above.
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
