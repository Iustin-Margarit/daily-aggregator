import { cookies } from 'next/headers';
import { GuestImport } from '@/components/saved/guest-import';
import { FontSizeSync } from '@/components/site/font-size-sync';
import { GuestPrefsKeeper } from '@/components/site/guest-prefs-keeper';
import { KeyboardReading } from '@/components/site/keyboard-reading';
import { SkipLink } from '@/components/site/skip-link';
import { SiteFooter } from '@/components/site/site-footer';
import { BottomNav, SiteHeader, type HeaderUser } from '@/components/site/site-header';
import { QuickReadHost } from '@/components/story/quick-read';
import { accentVariables } from '@/lib/colors';
import { GUEST_ACCENT_COOKIE, parseGuestAccent } from '@/lib/guest';
import { PAPER_ID } from '@/lib/guest-prefs';
import { getCurrentProfile, getSessionUser } from '@/lib/supabase/server';

/** The paper's pages: the bar, the page, the footer and the bottom bar, and the one quick-read sheet over them. */
export default async function PaperLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, jar] = await Promise.all([getSessionUser(), getCurrentProfile(), cookies()]);
  const signedIn = Boolean(user && profile);

  const headerUser: HeaderUser | null =
    user && profile
      ? {
          email: user.email ?? null,
          username: profile.username,
          accent: profile.banner_color,
          isAdmin: profile.role === 'admin',
        }
      : null;
  // The account's ink, or the one a visitor chose in Settings (kept in this browser).
  const accent = profile ? profile.banner_color : parseGuestAccent(jar.get(GUEST_ACCENT_COOKIE)?.value);

  return (
    <>
      {/* Settings changes the ink at once through this element's variables (lib/guest-prefs.ts). */}
      <SkipLink />
      <div id={PAPER_ID} data-accent="" style={accentVariables(accent)} className="flex min-h-screen flex-col">
        <SiteHeader user={headerUser} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <BottomNav user={headerUser} />
      </div>
      {/* The quick-read sheet: mounted once, opened by any headline (lib/story-cache.ts). */}
      <QuickReadHost userId={signedIn && user ? user.id : null} />
      {/* j / k, Enter, s, /, Esc and ? on every page of the paper. */}
      <KeyboardReading userId={signedIn && user ? user.id : null} />
      {profile && <FontSizeSync value={profile.font_size} />}
      {/* Clippings kept in this browser before signing in move into the account. */}
      {user && profile && <GuestImport userId={user.id} />}
      {/* So do the visitor's Settings; for visitors, a dropped cookie comes back from localStorage. */}
      <GuestPrefsKeeper signedIn={signedIn} />
    </>
  );
}
