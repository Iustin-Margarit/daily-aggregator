import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopicsForm } from '@/components/onboarding/topics-form';
import { createClient, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Your sections' };

export default async function OnboardingPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!user || !profile) redirect('/login?next=/onboarding');

  const supabase = await createClient();
  const [{ data: categories }, { data: preferences }, { data: sources }] = await Promise.all([
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    supabase.from('user_preferred_categories').select('category_id').eq('user_id', user.id),
    supabase.from('sources').select('category_id').eq('is_enabled', true),
  ]);

  const sourceCounts: Record<string, number> = {};
  for (const source of sources ?? []) sourceCounts[source.category_id] = (sourceCounts[source.category_id] ?? 0) + 1;

  const isFirstRun = !profile.has_completed_onboarding;

  return (
    <div className="container max-w-5xl py-8 sm:py-12">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="kicker">{isFirstRun ? 'Welcome, new reader' : 'Your paper'}</p>
        <h1 className="headline mt-2 text-4xl sm:text-5xl">{isFirstRun ? 'Choose your sections' : 'Your sections'}</h1>
        <p className="mt-3 italic text-muted-foreground">
          {isFirstRun
            ? 'Pick the sections for your paper. Change them any time; the “For you” edition also learns from what you like.'
            : 'Your front page shows these sections by default. You can still read every section from the filters.'}
        </p>
      </div>
      <TopicsForm
        categories={categories ?? []}
        selectedIds={(preferences ?? []).map((p) => p.category_id)}
        isFirstRun={isFirstRun}
        username={profile.username}
        sourceCounts={sourceCounts}
      />
    </div>
  );
}
