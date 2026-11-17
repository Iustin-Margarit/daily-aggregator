'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { LISTS_TAG, STORIES_TAG } from '@/lib/data/cached';
import { getRetentionDays } from '@/lib/env';
import { previewFeed, runIngestion, type IngestionSummary } from '@/lib/ingestion/run';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { FRONT_PATH } from '@/lib/routes';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) throw new Error('Only administrators can do this.');
}

export type IngestionActionResult =
  | { ok: true; summary: Omit<IngestionSummary, 'sources'> & { failed: { name: string; error?: string }[] } }
  | { ok: false; error: string };

/** "Fetch news now" from the admin panel (all sources, or just one). */
export async function runIngestionNow(sourceId?: string): Promise<IngestionActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    if (!admin) {
      return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server, so news cannot be fetched.' };
    }
    const summary = await runIngestion(admin, {
      trigger: 'admin',
      sourceIds: sourceId ? [sourceId] : undefined,
      retentionDays: getRetentionDays(),
    });
    revalidatePath('/admin', 'layout');
    revalidatePath(FRONT_PATH);
    updateTag(STORIES_TAG);
    // The newspapers too: a paper switched on or off outside the Newsroom (a migration) shows after "Fetch all".
    updateTag(LISTS_TAG);
    const { sources, ...rest } = summary;
    return {
      ok: true,
      summary: { ...rest, failed: sources.filter((s) => !s.ok).map((s) => ({ name: s.name, error: s.error })) },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The Newsroom changed a newspaper or a section (components/admin/sources-manager.tsx writes the change
 * itself): the lists and the front pages kept between requests are read again on the next visit.
 */
export async function paperListsChanged(): Promise<void> {
  await assertAdmin();
  updateTag(LISTS_TAG);
  updateTag(STORIES_TAG);
}

export type FeedTestResult =
  | { ok: true; title: string | null; link: string | null; itemCount: number; sample: { title: string; image: boolean }[] }
  | { ok: false; error: string };

/** Validates an RSS/Atom URL before saving it as a source. */
export async function testFeedUrl(url: string): Promise<FeedTestResult> {
  try {
    await assertAdmin();
    if (!/^https?:\/\//i.test(url.trim())) return { ok: false, error: 'The URL must start with http:// or https://' };
    const preview = await previewFeed(url.trim());
    return {
      ok: true,
      title: preview.title,
      link: preview.link,
      itemCount: preview.itemCount,
      sample: preview.articles.slice(0, 4).map((a) => ({ title: a.title, image: Boolean(a.image_url) })),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
