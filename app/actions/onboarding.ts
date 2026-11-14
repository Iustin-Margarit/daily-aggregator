'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GUEST_SECTIONS_COOKIE } from '@/lib/guest';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';
import { profileSaveError, validateUsername } from '@/lib/validation';

const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

export async function saveTopics(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const skip = formData.get('intent') === 'skip';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const categoryIds = skip
    ? []
    : [...new Set(formData.getAll('categories').map(String))].filter((id) => UUID.test(id)).slice(0, 50);

  // A visitor without an account: the sections are kept in a cookie for a year
  // (lib/guest.ts) and move into the account when they sign up.
  if (!user) {
    const jar = await cookies();
    if (categoryIds.length > 0) {
      jar.set(GUEST_SECTIONS_COOKIE, categoryIds.join(','), { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    } else {
      jar.delete(GUEST_SECTIONS_COOKIE);
    }
    redirect('/feed');
  }
  const rawUsername = formData.get('username');

  const updates: { has_completed_onboarding: boolean; username?: string } = { has_completed_onboarding: true };
  if (typeof rawUsername === 'string') {
    const username = rawUsername.trim();
    const problem = validateUsername(username);
    if (problem) return fail(problem);
    updates.username = username;
  }

  const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', user.id);
  if (profileError) {
    return fail(profileSaveError(profileError, 'Could not save your profile. Please try again.'));
  }

  if (!skip) {
    const { error: deleteError } = await supabase.from('user_preferred_categories').delete().eq('user_id', user.id);
    if (deleteError) return fail('Could not update your topics. Please try again.');

    if (categoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from('user_preferred_categories')
        .insert(categoryIds.map((category_id) => ({ user_id: user.id, category_id })));
      if (insertError) return fail('Could not save your topics. Please try again.');
    }
  }

  // The sections are in the account now; the visitor's cookie is no longer needed.
  (await cookies()).delete(GUEST_SECTIONS_COOKIE);
  revalidatePath('/', 'layout');
  redirect('/feed');
}
