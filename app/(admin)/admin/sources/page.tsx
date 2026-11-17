import type { Metadata } from 'next';
import { SourcesManager, type AdminSource, type SourceStats } from '@/components/admin/sources-manager';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Wire services' };
export const maxDuration = 60;

export default async function SourcesPage() {
  const supabase = await createClient();
  const [{ data: sources, error }, { data: categories }, { data: stats }] = await Promise.all([
    supabase.rpc('admin_list_sources'),
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    // Stories and photographs of the last 7 days, per paper (admin_source_stats); the page still works without them.
    supabase.rpc('admin_source_stats'),
  ]);

  if (error) return <p className="text-sm text-destructive">Could not load sources: {error.message}</p>;

  const weekly: Record<string, SourceStats> = {};
  for (const row of stats ?? []) weekly[row.source_id] = { stories: row.stories_week, photos: row.photos_week };

  return <SourcesManager initialSources={(sources ?? []) as AdminSource[]} categories={categories ?? []} stats={weekly} />;
}
