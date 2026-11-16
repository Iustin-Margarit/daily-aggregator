import 'server-only';
import { cookies } from 'next/headers';
import { getSections } from '@/lib/data/cached';
import { GUEST_SECTIONS_COOKIE, guestMutesFrom, parseGuestSections, type GuestMutes } from '@/lib/guest';
import { createClient, getCurrentProfile, getSessionUser } from '@/lib/supabase/server';
import type { Category } from '@/lib/types';

export type ReaderContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  /** The account's id, or null for a visitor. */
  userId: string | null;
  username: string | null;
  categories: Category[];
  /** The reader's chosen sections that still exist (an account's, or a visitor's cookie). */
  preferredIds: string[];
  /** A visitor's muted newspapers and words (an account keeps its own in the database). */
  guestMutes: GuestMutes | undefined;
  /** False when the section list could not be loaded (the database is unreachable). */
  loaded: boolean;
};

/**
 * Who is reading and what they chose, for the pages that print the paper. Everything goes out
 * at once: the session comes from the proxy (no trip to Supabase Auth), then the profile, the
 * sections (kept between requests) and the reader's choice load side by side.
 */
export async function getReaderContext(): Promise<ReaderContext> {
  const [user, jar, supabase] = await Promise.all([getSessionUser(), cookies(), createClient()]);
  const [profile, categories, { data: accountPreferences }] = await Promise.all([
    getCurrentProfile(),
    // The sections are the same for everyone (kept between requests, lib/data/cached.ts); null if they could not be read.
    getSections().catch((error: unknown) => {
      console.error('[reader] could not load the sections:', error);
      return null;
    }),
    user
      ? supabase.from('user_preferred_categories').select('category_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { category_id: string }[] }),
  ]);
  const signedIn = Boolean(user && profile);
  const chosen = signedIn ? (accountPreferences ?? []).map((p) => p.category_id) : parseGuestSections(jar.get(GUEST_SECTIONS_COOKIE)?.value);
  const list: Category[] = categories ?? [];
  return {
    supabase,
    userId: signedIn && user ? user.id : null,
    username: signedIn && profile ? profile.username : null,
    categories: list,
    preferredIds: chosen.filter((id) => list.some((c) => c.id === id)),
    guestMutes: signedIn ? undefined : guestMutesFrom((name) => jar.get(name)?.value),
    loaded: Boolean(categories),
  };
}
