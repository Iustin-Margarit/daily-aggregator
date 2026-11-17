import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { Database } from '@/lib/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { FRONT_PAGE_ARGS, type FrontRow } from '@/lib/front-page';
import type { Category } from '@/lib/types';

/*
 * What every visitor sees alike, kept by Next.js between requests so a page does not ask the
 * database again each time:
 * - the sections and the newspapers (an hour; the Newsroom clears them on every change);
 * - the front page of a visitor without mutes, for each choice of sections (five minutes; every
 *   news fetch clears it, so new stories show at once).
 * Read with the anonymous key and no cookies: nothing here may depend on who is reading. Anything
 * personal (an account's hidden stories and mutes, a visitor's mutes) is read live instead.
 * Failures are thrown, never kept: the next request tries again.
 */

/** Cleared when the Newsroom changes a section or a newspaper (app/actions/admin.ts). */
export const LISTS_TAG = 'paper-lists';
/** Cleared at the end of every news fetch (lib/ingestion/auto-refresh.ts, the cron route, "Fetch now"). */
export const STORIES_TAG = 'paper-stories';

function anonClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type Paper = { id: string; name: string; category_id: string; website_url: string | null; description: string | null };

/** The newspapers as the ribbon's Papers ticket lists them: only what it prints, to keep the page small. */
export function ribbonPapers(papers: Paper[] | null): { id: string; name: string; category_id: string }[] {
  return (papers ?? []).map(({ id, name, category_id }) => ({ id, name, category_id }));
}

export const getSections = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await anonClient().from('categories').select('id, name, sort_order').order('sort_order').order('name');
    if (error) throw new Error(`Could not load the sections: ${error.message}`);
    return data ?? [];
  },
  ['sections'],
  { tags: [LISTS_TAG], revalidate: 3600 },
);

export const getPapers = unstable_cache(
  async (): Promise<Paper[]> => {
    const { data, error } = await anonClient().from('sources').select('id, name, category_id, website_url, description').eq('is_enabled', true).order('name');
    if (error) throw new Error(`Could not load the newspapers: ${error.message}`);
    return data ?? [];
  },
  ['papers'],
  { tags: [LISTS_TAG], revalidate: 3600 },
);

/** The front page for a visitor without mutes; `sections` is their sorted choice ("" = every section). */
export const getPlainFrontPage = unstable_cache(
  async (sections: string): Promise<FrontRow[]> => {
    const ids = sections ? sections.split(',') : [];
    const { data, error } = await anonClient().rpc('get_front_page', { p_category_ids: ids.length ? ids : undefined, ...FRONT_PAGE_ARGS });
    if (error) throw new Error(`Could not load the front page: ${error.message}`);
    return (data ?? []) as FrontRow[];
  },
  ['front-page'],
  { tags: [STORIES_TAG], revalidate: 300 },
);
