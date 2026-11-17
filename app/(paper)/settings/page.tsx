import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AppearanceSection,
  DangerZone,
  Ledger,
  ProfileSection,
  MutesSection,
  ReadingRoomSection,
} from '@/components/profile/settings-sections';
import { ledgerIndex } from '@/components/profile/ledger-index';
import { PageHeader } from '@/components/site/page-header';
import { PeekNav } from '@/components/site/peek-nav';
import { DEFAULT_ACCENT } from '@/lib/colors';
import { GUEST_ACCENT_COOKIE, guestMutesFrom, parseGuestAccent } from '@/lib/guest';
import { getI18n } from '@/lib/i18n/server';
import { createClient, getCurrentProfile, getCurrentUser, getSessionUser } from '@/lib/supabase/server';
import type { Category, FontSize, SourceOption } from '@/lib/types';
import { loginPath, SETTINGS_PATH } from '@/lib/routes';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.settings };
}

const FONT_SIZES = new Set(['small', 'medium', 'large']);

/**
 * Settings as the Reader's Ledger: a short head, the ledger's index (a ribbon on phones, the margin on wide
 * screens) and its entries, each a few plain choices that apply at once. Visitors get the entries kept in their
 * browser only: appearance, reading, muted papers and words.
 */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const [session, query, { t, rich }, supabase, jar] = await Promise.all([getSessionUser(), searchParams, getI18n(), createClient(), cookies()]);
  const w = t.settings;
  const guest = !session;

  // Everyone gets the newspapers (for the Mute menu, grouped by section); the account's lists load at the same time.
  const [user, profile, { data: categoryRows }, { data: sourceRows }, account] = await Promise.all([
    guest ? null : getCurrentUser(),
    guest ? null : getCurrentProfile(),
    supabase.from('categories').select('id, name, sort_order').order('sort_order').order('name'),
    supabase.from('sources').select('id, name, category_id').eq('is_enabled', true).order('name'),
    session
      ? Promise.all([
          supabase.from('muted_sources').select('source_id, sources(name)').eq('user_id', session.id),
          supabase.from('muted_keywords').select('keyword').eq('user_id', session.id).order('keyword'),
        ])
      : null,
  ]);
  if (session && (!user || !profile)) redirect(`/login?next=${SETTINGS_PATH}`);

  const categories: Category[] = categoryRows ?? [];
  const sources: SourceOption[] = (sourceRows ?? []) as SourceOption[];
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? w.unknownSource;

  let muted: { id: string; name: string }[];
  let keywords: string[];
  if (account) {
    const [{ data: mutedRows }, { data: mutedWords }] = account;
    muted = (mutedRows ?? []).map((m) => ({ id: m.source_id, name: m.sources?.name ?? w.unknownSource }));
    keywords = (mutedWords ?? []).map((k) => k.keyword);
  } else {
    // A visitor's choices, from this browser's cookies (lib/guest.ts).
    const mutes = guestMutesFrom((name) => jar.get(name)?.value);
    muted = mutes.sourceIds.filter((id) => sources.some((s) => s.id === id)).map((id) => ({ id, name: nameOf(id) }));
    keywords = mutes.words;
  }
  muted.sort((a, b) => a.name.localeCompare(b.name));

  const fontCookie = jar.get('font-size')?.value;
  const fontSize = (profile?.font_size ?? (fontCookie && FONT_SIZES.has(fontCookie) ? fontCookie : 'medium')) as FontSize;
  const accent = profile?.banner_color ?? parseGuestAccent(jar.get(GUEST_ACCENT_COOKIE)?.value) ?? DEFAULT_ACCENT;

  return (
    <div className="container pb-8 pt-6 sm:pt-9">
      {/* A short head, like the paper's other pages. */}
      <PageHeader compact kicker={w.kicker} title={w.title} />

      <div className="mt-8 grid gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-0">
        {/* The ledger's index: a ribbon on phones, a contents list down the margin on wide screens. */}
        <aside className="min-w-0 lg:border-r lg:border-rule/40 lg:pr-8">
          <div className="lg:sticky lg:top-24">
            <p className="label mb-2 hidden text-(--brass-ink) lg:block">{w.contents}</p>
            <PeekNav kind="settings" aria-label={w.contentsLabel} className="folder-index">
              {ledgerIndex(guest).map(({ id, numeral }) => (
                <a key={id} href={`#${id}`} className="dept-tab">
                  <span className="folder-name">{w.entries[id]}</span>
                  <span className="hidden font-display tracking-normal text-(--brass-ink) normal-case lg:inline">{numeral}</span>
                </a>
              ))}
            </PeekNav>
          </div>
        </aside>

        <div className="min-w-0 space-y-8 lg:pl-10">
          <Ledger guest={guest}>
            {user && profile && <ProfileSection username={profile.username} email={user.email ?? ''} />}
            <AppearanceSection bannerColor={accent} fontSize={fontSize} guest={guest} />
            <ReadingRoomSection />
            <MutesSection
              userId={user?.id ?? null}
              muted={muted}
              sources={sources}
              categories={categories}
              keywords={keywords}
            />
            {/* ?delete=confirm: back from "Confirm with Google", so the delete dialog opens again. */}
            {user && <DangerZone openOnLoad={query.delete === 'confirm'} />}
          </Ledger>
        </div>
      </div>

      {/* Visitors: one line under all the settings on where they are kept, and the way to keep them everywhere (as on Saved). */}
      {guest && (
        <p className="mt-10 border-t border-dashed border-rule/45 pt-5 text-pretty text-center text-[0.95rem] italic text-muted-foreground">
          {rich(w.guestNote, {
            login: (
              <Link
                href={loginPath(SETTINGS_PATH)}
                className="font-medium not-italic text-foreground underline decoration-(--ink-gold) underline-offset-4 hover:decoration-2"
              >
                {w.guestLogin}
              </Link>
            ),
          })}
        </p>
      )}
    </div>
  );
}
