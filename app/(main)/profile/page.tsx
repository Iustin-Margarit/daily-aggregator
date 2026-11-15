import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AppearanceSection,
  DangerZone,
  Ledger,
  ProfileSection,
  ReadingRoomSection,
  SectionsAndSourcesSection,
  SigningInSection,
} from '@/components/profile/settings-sections';
import { ledgerIndex } from '@/components/profile/ledger-index';
import { Engraving } from '@/components/site/engraving';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import { hasPasswordLogin } from '@/lib/auth';
import { DEFAULT_ACCENT } from '@/lib/colors';
import { GUEST_ACCENT_COOKIE, GUEST_SECTIONS_COOKIE, guestMutesFrom, parseGuestAccent, parseGuestSections } from '@/lib/guest';
import { getI18n } from '@/lib/i18n/server';
import { createClient, getCurrentProfile, getCurrentUser, getSessionUser } from '@/lib/supabase/server';
import type { Category, FontSize, SourceOption } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.settings };
}

const FONT_SIZES = new Set(['small', 'medium', 'large']);

/**
 * Settings as the Reader's Ledger, kept in the printer's office: a nameplate
 * with an old woodcut of a print shop and the reader's own seal, then the
 * ledger's index down the margin column and its entries beside it.
 * Visitors without an account get the same ledger with the entries kept in
 * their browser only: the printing, the reading room, sections and papers.
 */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const [session, query, { t, rich }, supabase, jar] = await Promise.all([getSessionUser(), searchParams, getI18n(), createClient(), cookies()]);
  const w = t.settings;
  const guest = !session;

  // Everyone gets the newspapers (for the Mute menu) and the sections; the account's lists load at the same time.
  const [user, profile, { data: categoryRows }, { data: sourceRows }, account] = await Promise.all([
    guest ? null : getCurrentUser(),
    guest ? null : getCurrentProfile(),
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    supabase.from('sources').select('id, name, category_id').eq('is_enabled', true).order('name'),
    session
      ? Promise.all([
          supabase.from('muted_sources').select('source_id, sources(name)').eq('user_id', session.id),
          supabase.from('user_preferred_categories').select('category_id').eq('user_id', session.id),
          supabase.from('muted_keywords').select('keyword').eq('user_id', session.id).order('keyword'),
        ])
      : null,
  ]);
  if (session && (!user || !profile)) redirect('/login?next=/profile');

  const categories: Category[] = categoryRows ?? [];
  const sources: SourceOption[] = (sourceRows ?? []) as SourceOption[];
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? w.unknownSource;

  let sectionIds: string[];
  let muted: { id: string; name: string }[];
  let keywords: string[];
  if (account) {
    const [{ data: mutedRows }, { data: preferences }, { data: mutedWords }] = account;
    sectionIds = (preferences ?? []).map((p) => p.category_id);
    muted = (mutedRows ?? []).map((m) => ({ id: m.source_id, name: m.sources?.name ?? w.unknownSource }));
    keywords = (mutedWords ?? []).map((k) => k.keyword);
  } else {
    // A visitor's choices, from this browser's cookies (lib/guest.ts).
    const mutes = guestMutesFrom((name) => jar.get(name)?.value);
    sectionIds = parseGuestSections(jar.get(GUEST_SECTIONS_COOKIE)?.value);
    muted = mutes.sourceIds.filter((id) => sources.some((s) => s.id === id)).map((id) => ({ id, name: nameOf(id) }));
    keywords = mutes.words;
  }
  muted.sort((a, b) => a.name.localeCompare(b.name));
  const topics = categories.filter((c) => sectionIds.includes(c.id)).map((c) => c.name);

  const fontCookie = jar.get('font-size')?.value;
  const fontSize = (profile?.font_size ?? (fontCookie && FONT_SIZES.has(fontCookie) ? fontCookie : 'medium')) as FontSize;
  const accent = profile?.banner_color ?? parseGuestAccent(jar.get(GUEST_ACCENT_COOKIE)?.value) ?? DEFAULT_ACCENT;
  const hasPassword = user ? hasPasswordLogin(user.identities) : false;

  return (
    <div className="container pb-8 pt-10 sm:pt-14">
      {/* The nameplate of the ledger. */}
      <header
        className={
          guest
            ? 'card-ornate grid items-center gap-6 px-6 py-7 [--corner:30px] sm:px-10 sm:py-9 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10'
            : 'card-ornate grid items-center gap-6 px-6 py-7 [--corner:30px] sm:px-10 sm:py-9 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-10'
        }
      >
        <Engraving
          name="printing-office"
          soft
          className="mx-auto h-36 sm:h-44"
          label={w.woodcut}
        />
        <div className="text-center md:text-left">
          <p className="kicker">{w.kicker}</p>
          <h1 className="headline mt-2 text-[2.6rem] sm:text-[3.4rem]">{w.title}</h1>
          <p className="mt-2 max-w-xl text-pretty text-[1.05rem] italic text-muted-foreground md:max-w-none">{guest ? w.guestIntro : w.intro}</p>
        </div>
        {profile && (
          <div className="flex flex-col items-center gap-1.5 text-center md:border-l md:border-rule/35 md:pl-10">
            <ColoredAvatar username={profile.username} color={profile.avatar_color} size="xl" className="h-16 w-16 text-[2rem] md:h-24 md:w-24 md:text-[2.9rem]" />
            <p className="label mt-1 text-muted-foreground">{w.keptFor}</p>
            <p className="max-w-[12rem] truncate font-display text-[1.15rem] font-semibold">{profile.username}</p>
          </div>
        )}
      </header>

      {/* Visitors: where their choices live, and what an account adds. */}
      {guest && (
        <p className="mt-5 text-pretty text-center text-[0.98rem] italic text-muted-foreground">
          {rich(w.guestNote, {
            login: (
              <Link
                href="/login?next=/profile"
                className="font-medium not-italic text-foreground underline decoration-(--ink-gold) underline-offset-4 hover:decoration-2"
              >
                {w.guestLogin}
              </Link>
            ),
          })}
        </p>
      )}

      <ScrollDivider className={guest ? 'mt-5' : 'mt-8'} />

      <div className="mt-8 grid gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-0">
        {/* The ledger's index: a ribbon on phones, a contents list down the margin on wide screens. */}
        <aside className="min-w-0 lg:border-r lg:border-rule/40 lg:pr-8">
          <div className="lg:sticky lg:top-24">
            <p className="label mb-2 hidden text-(--brass-ink) lg:block">{w.contents}</p>
            <nav aria-label={w.contentsLabel} className="folder-index">
              {ledgerIndex(guest).map(({ id, numeral }) => (
                <a key={id} href={`#${id}`} className="dept-tab">
                  <span className="folder-name">{w.entries[id]}</span>
                  <span className="hidden font-display tracking-normal text-(--brass-ink) normal-case lg:inline">{numeral}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-8 lg:pl-10">
          <Ledger guest={guest}>
            {user && profile && <ProfileSection username={profile.username} avatarColor={profile.avatar_color} email={user.email ?? ''} />}
            <AppearanceSection bannerColor={accent} fontSize={fontSize} guest={guest} />
            <ReadingRoomSection />
            <SectionsAndSourcesSection
              topics={topics}
              userId={user?.id ?? null}
              muted={muted}
              sources={sources}
              categories={categories}
              keywords={keywords}
            />
            {user && (
              <>
                <SigningInSection email={user.email ?? ''} hasPassword={hasPassword} />
                {/* ?delete=confirm: back from "Confirm with Google", so the delete dialog opens again. */}
                <DangerZone hasPassword={hasPassword} openOnLoad={!hasPassword && query.delete === 'confirm'} />
              </>
            )}
          </Ledger>
        </div>
      </div>
    </div>
  );
}
