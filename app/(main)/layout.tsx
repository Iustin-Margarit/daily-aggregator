import { GuestImport } from '@/components/saved/guest-import';
import { FontSizeSync } from '@/components/site/font-size-sync';
import { SiteFooter } from '@/components/site/site-footer';
import { BottomNav, SiteHeader, type HeaderUser } from '@/components/site/site-header';
import { accentVariables } from '@/lib/colors';
import { getCurrentProfile, getSessionUser } from '@/lib/supabase/server';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getSessionUser(), getCurrentProfile()]);

  const headerUser: HeaderUser | null =
    user && profile
      ? {
          email: user.email ?? null,
          username: profile.username,
          avatarColor: profile.avatar_color,
          isAdmin: profile.role === 'admin',
        }
      : null;

  return (
    <>
      <div data-accent="" style={accentVariables(profile?.banner_color)} className="flex min-h-screen flex-col">
        <SiteHeader user={headerUser} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <BottomNav user={headerUser} />
      </div>
      {profile && <FontSizeSync value={profile.font_size} />}
      {/* Clippings kept in this browser before signing in move into the account. */}
      {user && profile && <GuestImport userId={user.id} />}
    </>
  );
}
