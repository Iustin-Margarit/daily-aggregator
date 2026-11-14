import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { cookies } from 'next/headers';
import { TopicsForm } from '@/components/onboarding/topics-form';
import { PageHeader } from '@/components/site/page-header';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { GUEST_SECTIONS_COOKIE, parseGuestSections } from '@/lib/guest';
import { createClient, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.sections };
}

export default async function OnboardingPage() {
  const [user, profile, jar, { t }] = await Promise.all([getCurrentUser(), getCurrentProfile(), cookies(), getI18n()]);
  const w = t.onboarding;
  // Sections a visitor chose before signing up (lib/guest.ts).
  const guestSections = parseGuestSections(jar.get(GUEST_SECTIONS_COOKIE)?.value);

  const supabase = await createClient();
  const [{ data: categories }, { data: preferences }, { data: sources }] = await Promise.all([
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    user
      ? supabase.from('user_preferred_categories').select('category_id').eq('user_id', user.id)
      : Promise.resolve({ data: guestSections.map((category_id) => ({ category_id })) }),
    supabase.from('sources').select('category_id').eq('is_enabled', true),
  ]);

  const sourceCounts: Record<string, number> = {};
  for (const source of sources ?? []) sourceCounts[source.category_id] = (sourceCounts[source.category_id] ?? 0) + 1;

  const isGuest = !user || !profile;
  const isFirstRun = !isGuest && !profile.has_completed_onboarding;
  // A new account starts from the sections its owner chose as a visitor.
  const selectedIds =
    isFirstRun && (preferences ?? []).length === 0 ? guestSections : (preferences ?? []).map((p) => p.category_id);

  return (
    <div className="container py-8 sm:py-10">
      <PageHeader
        kicker={isFirstRun ? w.kickerFirst : isGuest ? w.kickerGuest : w.kicker}
        title={isFirstRun ? w.titleFirst : w.title}
        description={isFirstRun ? w.descriptionFirst : isGuest ? w.descriptionGuest : w.description}
      />
      <ScrollDivider className="mb-8 mt-8" />
      <TopicsForm
        categories={categories ?? []}
        selectedIds={selectedIds}
        isFirstRun={isFirstRun}
        username={profile?.username ?? ''}
        sourceCounts={sourceCounts}
      />
    </div>
  );
}
