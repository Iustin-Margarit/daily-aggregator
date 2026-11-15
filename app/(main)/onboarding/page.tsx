import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { cookies } from 'next/headers';
import { TopicsForm } from '@/components/onboarding/topics-form';
import { PageHeader } from '@/components/site/page-header';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { GUEST_SECTIONS_COOKIE, parseGuestSections } from '@/lib/guest';
import { createClient, getCurrentProfile, getSessionUser } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.sections };
}

export default async function OnboardingPage() {
  const [user, jar, { t }, supabase] = await Promise.all([getSessionUser(), cookies(), getI18n(), createClient()]);
  const w = t.onboarding;
  // Sections a visitor chose before signing up (lib/guest.ts).
  const guestSections = parseGuestSections(jar.get(GUEST_SECTIONS_COOKIE)?.value);

  // The profile and the lists load side by side.
  const [profile, { data: categories }, { data: preferences }, { data: sources }] = await Promise.all([
    getCurrentProfile(),
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
    // Phones: a short header, so the first row of stamps shows without scrolling.
    <div className="container pb-8 pt-4 sm:py-10">
      <PageHeader
        kicker={isFirstRun ? w.kickerFirst : isGuest ? w.kickerGuest : w.kicker}
        title={isFirstRun ? w.titleFirst : w.title}
        description={isFirstRun ? w.descriptionFirst : isGuest ? w.descriptionGuest : w.description}
        compact
      />
      <ScrollDivider className="my-2 sm:my-8 max-sm:[&_.ornament-mask]:w-[7.5rem]" />
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
