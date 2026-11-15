import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import {
  AppearanceSection,
  DangerZone,
  ProfileSection,
  ReadingRoomSection,
  SectionsAndSourcesSection,
  SigningInSection,
} from '@/components/profile/settings-sections';
import { LEDGER_INDEX } from '@/components/profile/ledger-index';
import { Engraving } from '@/components/site/engraving';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import { hasPasswordLogin } from '@/lib/auth';
import { createClient, getCurrentProfile, getCurrentUser, getSessionUser } from '@/lib/supabase/server';
import type { FontSize } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.settings };
}

/**
 * Settings as the Reader's Ledger, kept in the printer's office: a nameplate
 * with an old woodcut of a print shop and the reader's own seal, then the
 * ledger's index down the margin column and its entries beside it.
 */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const [session, query, { t }, supabase] = await Promise.all([getSessionUser(), searchParams, getI18n(), createClient()]);
  const w = t.settings;
  if (!session) redirect('/login?next=/profile');

  // The full account (its sign-in methods) comes from Supabase Auth; the ledger's lists load at the same time.
  const [user, profile, { data: muted }, { data: preferences }, { data: mutedWords }] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    supabase.from('muted_sources').select('source_id, sources(name)').eq('user_id', session.id),
    supabase.from('user_preferred_categories').select('categories(name, sort_order)').eq('user_id', session.id),
    supabase.from('muted_keywords').select('keyword').eq('user_id', session.id).order('keyword'),
  ]);
  if (!user || !profile) redirect('/login?next=/profile');
  const hasPassword = hasPasswordLogin(user.identities);

  const mutedSources = (muted ?? []).map((m) => ({ id: m.source_id, name: m.sources?.name ?? w.unknownSource }));
  const topics = (preferences ?? [])
    .map((p) => p.categories)
    .filter((c): c is { name: string; sort_order: number } => Boolean(c))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.name);

  return (
    <div className="container pb-8 pt-10 sm:pt-14">
      {/* The nameplate of the ledger. */}
      <header className="card-ornate grid items-center gap-6 px-6 py-7 [--corner:30px] sm:px-10 sm:py-9 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-10">
        <Engraving
          name="printing-office"
          soft
          className="mx-auto h-36 sm:h-44"
          label={w.woodcut}
        />
        <div className="text-center md:text-left">
          <p className="kicker">{w.kicker}</p>
          <h1 className="headline mt-2 text-[2.6rem] sm:text-[3.4rem]">{w.title}</h1>
          <p className="mt-2 max-w-xl text-pretty text-[1.05rem] italic text-muted-foreground md:max-w-none">{w.intro}</p>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center md:border-l md:border-rule/35 md:pl-10">
          <ColoredAvatar username={profile.username} color={profile.avatar_color} size="xl" className="h-16 w-16 text-[2rem] md:h-24 md:w-24 md:text-[2.9rem]" />
          <p className="label mt-1 text-muted-foreground">{w.keptFor}</p>
          <p className="max-w-[12rem] truncate font-display text-[1.15rem] font-semibold">{profile.username}</p>
        </div>
      </header>

      <ScrollDivider className="mt-8" />

      <div className="mt-8 grid gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-0">
        {/* The ledger's index: a ribbon on phones, a contents list down the margin on wide screens. */}
        <aside className="min-w-0 lg:border-r lg:border-rule/40 lg:pr-8">
          <div className="lg:sticky lg:top-24">
            <p className="label mb-2 hidden text-(--brass-ink) lg:block">{w.contents}</p>
            <nav aria-label={w.contentsLabel} className="folder-index">
              {LEDGER_INDEX.map(({ id, numeral }) => (
                <a key={id} href={`#${id}`} className="dept-tab">
                  <span className="folder-name">{w.entries[id]}</span>
                  <span className="hidden font-display tracking-normal text-(--brass-ink) normal-case lg:inline">{numeral}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-8 lg:pl-10">
          <ProfileSection username={profile.username} avatarColor={profile.avatar_color} email={user.email ?? ''} />
          <AppearanceSection bannerColor={profile.banner_color} fontSize={profile.font_size as FontSize} />
          <ReadingRoomSection />
          <SectionsAndSourcesSection topics={topics} userId={user.id} sources={mutedSources} keywords={(mutedWords ?? []).map((w) => w.keyword)} />
          <SigningInSection email={user.email ?? ''} hasPassword={hasPassword} />
          {/* ?delete=confirm: back from "Confirm with Google", so the delete dialog opens again. */}
          <DangerZone hasPassword={hasPassword} openOnLoad={!hasPassword && query.delete === 'confirm'} />
        </div>
      </div>
    </div>
  );
}
