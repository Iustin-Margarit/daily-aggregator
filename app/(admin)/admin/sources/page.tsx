import type { Metadata } from 'next';
import { SourcesManager, type AdminSource } from '@/components/admin/sources-manager';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Wire services' };
export const maxDuration = 60;

export default async function SourcesPage() {
  const supabase = await createClient();
  const [{ data: sources, error }, { data: categories }] = await Promise.all([
    supabase.rpc('admin_list_sources'),
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
  ]);

  if (error) return <p className="text-sm text-destructive">Could not load sources: {error.message}</p>;

  return <SourcesManager initialSources={(sources ?? []) as AdminSource[]} categories={categories ?? []} />;
}
