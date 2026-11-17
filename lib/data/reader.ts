import 'server-only';
import { cookies } from 'next/headers';
import { getSections } from '@/lib/data/cached';
import { guestMutesFrom, type GuestMutes } from '@/lib/guest';
import { createClient, getCurrentProfile, getSessionUser } from '@/lib/supabase/server';
import type { Category } from '@/lib/types';

export type ReaderContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  /** The account's id, or null for a visitor. */
  userId: string | null;
  username: string | null;
  categories: Category[];
  /** A visitor's muted newspapers and words (an account keeps its own in the database). */
  guestMutes: GuestMutes | undefined;
  /** False when the section list could not be loaded (the database is unreachable). */
  loaded: boolean;
};

/**
 * Who is reading, for the pages that print the paper. Everything goes out at once: the session
 * comes from the proxy (no trip to Supabase Auth), then the profile and the sections (kept between
 * requests) load side by side. Every reader's paper prints every section.
 */
export async function getReaderContext(): Promise<ReaderContext> {
  const [user, jar, supabase] = await Promise.all([getSessionUser(), cookies(), createClient()]);
  const [profile, categories] = await Promise.all([
    getCurrentProfile(),
    // The sections are the same for everyone (kept between requests, lib/data/cached.ts); null if they could not be read.
    getSections().catch((error: unknown) => {
      console.error('[reader] could not load the sections:', error);
      return null;
    }),
  ]);
  const signedIn = Boolean(user && profile);
  return {
    supabase,
    userId: signedIn && user ? user.id : null,
    username: signedIn && profile ? profile.username : null,
    categories: categories ?? [],
    guestMutes: signedIn ? undefined : guestMutesFrom((name) => jar.get(name)?.value),
    loaded: Boolean(categories),
  };
}
