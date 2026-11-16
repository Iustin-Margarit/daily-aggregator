'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GUEST_SECTIONS_COOKIE } from '@/lib/guest';
import { getI18n } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';
import { profileSaveError, validateUsername } from '@/lib/validation';
import { UUID } from '@/lib/uuid';
import { FRONT_PATH } from '@/lib/routes';

const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

type CookieJar = Awaited<ReturnType<typeof cookies>>;

/** The section ids a form or the Sections page sent: real ids only, no repeats, at most 50. */
function cleanSectionIds(ids: unknown[]): string[] {
  return [...new Set(ids.map(String))].filter((id) => UUID.test(id)).slice(0, 50);
}

/** A visitor's sections live in a cookie for a year (lib/guest.ts); none chosen = no cookie. */
function writeGuestSections(jar: CookieJar, categoryIds: string[]) {
  if (categoryIds.length > 0) {
    jar.set(GUEST_SECTIONS_COOKIE, categoryIds.join(','), { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  } else {
    jar.delete(GUEST_SECTIONS_COOKIE);
  }
}


/**
 * The Sections page saves each stamp the moment it is pressed: the whole choice
 * is sent and the account (or a visitor's cookie) is brought in line with it.
 * Only what changed is written, so a save that overlaps another one stays safe.
 */
export async function saveSections(ids: string[]): Promise<ActionResult> {
  const categoryIds = Array.isArray(ids) ? cleanSectionIds(ids) : [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const jar = await cookies();

  if (!user) {
    writeGuestSections(jar, categoryIds);
  } else {
    const { t } = await getI18n();
    let remove = supabase.from('user_preferred_categories').delete().eq('user_id', user.id);
    if (categoryIds.length > 0) remove = remove.not('category_id', 'in', `(${categoryIds.join(',')})`);
    const { error: deleteError } = await remove;
    if (deleteError) return fail(t.actions.topicsUpdateFailed);
    if (categoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from('user_preferred_categories')
        .upsert(categoryIds.map((category_id) => ({ user_id: user.id, category_id })), { onConflict: 'user_id,category_id', ignoreDuplicates: true });
      if (insertError) return fail(t.actions.topicsSaveFailed);
    }
    jar.delete(GUEST_SECTIONS_COOKIE);
  }
  // Every page of the paper reads the sections (the ribbon's "My sections"): let them print the new choice.
  revalidatePath('/', 'layout');
  return { ok: true, at: Date.now() };
}

export async function saveTopics(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const skip = formData.get('intent') === 'skip';
  const categoryIds = skip
    ? []
    : cleanSectionIds(formData.getAll('categories'));

  // A visitor without an account: the sections are kept in a cookie for a year
  // (lib/guest.ts) and move into the account when they sign up.
  if (!user) {
    const jar = await cookies();
    writeGuestSections(jar, categoryIds);
    redirect(FRONT_PATH);
  }
  const rawUsername = formData.get('username');
  const { t } = await getI18n();

  const updates: { has_completed_onboarding: boolean; username?: string } = { has_completed_onboarding: true };
  if (typeof rawUsername === 'string') {
    const username = rawUsername.trim();
    const problem = validateUsername(username, t.validation);
    if (problem) return fail(problem);
    updates.username = username;
  }

  const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', user.id);
  if (profileError) {
    return fail(profileSaveError(profileError, t.actions.profileRetry, t.validation));
  }

  if (!skip) {
    const { error: deleteError } = await supabase.from('user_preferred_categories').delete().eq('user_id', user.id);
    if (deleteError) return fail(t.actions.topicsUpdateFailed);

    if (categoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from('user_preferred_categories')
        .insert(categoryIds.map((category_id) => ({ user_id: user.id, category_id })));
      if (insertError) return fail(t.actions.topicsSaveFailed);
    }
  }

  // The sections are in the account now; the visitor's cookie is no longer needed.
  (await cookies()).delete(GUEST_SECTIONS_COOKIE);
  revalidatePath('/', 'layout');
  redirect(FRONT_PATH);
}
