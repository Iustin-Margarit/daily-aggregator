import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  AppearanceSection,
  DangerZone,
  EmailSection,
  MutedSourcesSection,
  PasswordSection,
  ProfileSection,
  TopicsSection,
} from '@/components/profile/settings-sections';
import { createClient, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import type { FontSize } from '@/lib/types';

export const metadata: Metadata = { title: 'Settings' };

export default async function ProfilePage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!user || !profile) redirect('/login?next=/profile');

  const supabase = await createClient();
  const [{ data: muted }, { data: preferences }] = await Promise.all([
    supabase.from('muted_sources').select('source_id, sources(name)').eq('user_id', user.id),
    supabase.from('user_preferred_categories').select('categories(name, sort_order)').eq('user_id', user.id),
  ]);

  const mutedSources = (muted ?? []).map((m) => ({ id: m.source_id, name: m.sources?.name ?? 'Unknown source' }));
  const topics = (preferences ?? [])
    .map((p) => p.categories)
    .filter((c): c is { name: string; sort_order: number } => Boolean(c))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.name);

  return (
    <div className="container max-w-3xl py-8 sm:py-10">
      <div className="border-b-2 border-rule pb-4 text-center">
        <p className="kicker">Your account</p>
        <h1 className="headline mt-1 text-4xl sm:text-5xl">Settings</h1>
        <p className="mt-2 italic text-muted-foreground">How you appear, what you read and how your paper is printed.</p>
      </div>

      <div className="mt-8 space-y-6">
        <ProfileSection username={profile.username} avatarColor={profile.avatar_color} email={user.email ?? ''} />
        <AppearanceSection bannerColor={profile.banner_color} fontSize={profile.font_size as FontSize} />
        <TopicsSection topics={topics} />
        <MutedSourcesSection userId={user.id} sources={mutedSources} />
        <EmailSection email={user.email ?? ''} />
        <PasswordSection />
        <DangerZone />
      </div>
    </div>
  );
}
