'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { EditionSelector } from '@/components/site/edition-selector';
import { Engraving } from '@/components/site/engraving';
import { Masthead } from '@/components/site/logo';
import { Ornament, type OrnamentName } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/client';
import { editionLabel } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';
import { useClientValue, useHydrated } from '@/lib/use-client-value';
import { cn } from '@/lib/utils';

export type HeaderUser = {
  email: string | null;
  username: string;
  avatarColor: string;
  isAdmin: boolean;
};

/** The reader's three places, in the same spot on every page. */
type NavIcon = 'front' | 'saved' | 'sections' | 'newsroom' | 'settings';

const READER_NAV: { href: string; icon: NavIcon }[] = [
  { href: '/feed', icon: 'front' },
  { href: '/saved', icon: 'saved' },
  { href: '/onboarding', icon: 'sections' },
];

/**
 * Each tab's small engraving, printed in the tab's ink (currentColor, brass when
 * current): a folded broadsheet, a quill, the Penny Black and the printing press.
 */
function TabIcon({ icon, className }: { icon: NavIcon; className?: string }) {
  // Printed in the tab's ink; the wrapper's hairline shadow thickens the fine lines a little
  // (a filter on the masked drawing itself would be masked away).
  const ink = 'block [--ornament-ink:currentColor] [--engraving-ink:currentColor]';
  return (
    <span className={cn('inline-flex shrink-0 drop-shadow-[0_0_0.4px_currentColor]', className)} aria-hidden="true">
      {icon === 'settings' ? (
        // The printer's section mark, as for Settings in the account menu.
        <span className="font-display text-[1.3rem] leading-none">§</span>
      ) : icon === 'front' ? (
        <Ornament name="broadsheet" className={cn('h-[1.15rem]', ink)} />
      ) : icon === 'sections' ? (
        <Ornament name="stamp" className={cn('h-[1.3rem]', ink)} />
      ) : (
        <Engraving name={icon === 'saved' ? 'quill' : 'press'} className={cn(icon === 'saved' ? 'h-[1.55rem]' : 'h-[1.35rem]', ink)} />
      )}
    </span>
  );
}

/** The id of the big front-page masthead (components/site/front-masthead.tsx). */
export const FRONT_MASTHEAD_ID = 'front-masthead';

function useSignOut() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    // Visitors read the paper too: back to the front page, not to a login form.
    router.replace('/feed');
    router.refresh();
  };
}

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navItems(user: HeaderUser | null) {
  return user?.isAdmin ? [...READER_NAV, { href: '/admin/dashboard', icon: 'newsroom' as const }] : READER_NAV;
}

/** The bottom bar: the same places, plus Settings for visitors (signed-in readers have it in the account menu). */
function bottomItems(user: HeaderUser | null): { href: string; icon: NavIcon }[] {
  return user ? navItems(user) : [...READER_NAV, { href: '/profile', icon: 'settings' }];
}

/**
 * True while the big masthead of a front page is on screen, so the small title
 * in the bar does not repeat it. Pages without one always get the small title.
 */
function useBigMastheadVisible(pathname: string) {
  const [seen, setSeen] = useState<{ path: string; visible: boolean } | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setSeen({ path: pathname, visible: entry.isIntersecting }), {
      rootMargin: '-64px 0px 0px 0px',
    });
    // The front page may still be showing its loading skeleton: wait for the masthead to arrive.
    let waiting: MutationObserver | null = null;
    const watch = () => {
      const target = document.getElementById(FRONT_MASTHEAD_ID);
      if (!target) return false;
      observer.observe(target);
      waiting?.disconnect();
      return true;
    };
    if (!watch() && (pathname === '/' || pathname === '/feed')) {
      waiting = new MutationObserver(() => void watch());
      waiting.observe(document.body, { childList: true, subtree: true });
    }
    return () => {
      observer.disconnect();
      waiting?.disconnect();
    };
  }, [pathname]);
  // Before the first observation, assume the front pages show their big masthead.
  return seen?.path === pathname ? seen.visible : pathname === '/' || pathname === '/feed';
}

/**
 * Phones, at the top of a front page: the edition line (Vol. · No. and the
 * reader's date) sits in the bar beside the account instead of an empty
 * space; the big masthead below then starts straight with the title.
 */
function HeaderEdition() {
  const { t, dates } = useI18n();
  const date = useClientValue(() => dates.short(new Date()), null);
  return (
    <p className="font-label leading-tight text-muted-foreground">
      <span className="block text-[0.74rem] font-semibold uppercase tracking-[0.13em]">{editionLabel(new Date(), t.masthead.volNo)}</span>
      <span className="block text-[0.82rem]">{date ?? ' '}</span>
    </p>
  );
}

/** An engraved ornament at the head of a menu line, in brass. */
function MenuMark({ name }: { name: OrnamentName }) {
  return (
    <span className="mr-3 flex w-6 shrink-0 justify-center" aria-hidden="true">
      <Ornament name={name} className="h-[1.15rem] max-w-6" />
    </span>
  );
}

const EDITIONS: { value: 'light' | 'dark' | 'system'; mark: OrnamentName }[] = [
  { value: 'light', mark: 'sun' },
  { value: 'dark', mark: 'moon' },
  { value: 'system', mark: 'globe' },
];

/**
 * The account menu, printed like the rest of the paper: the reader's seal and
 * byline at its head, then Settings (§, the printer's mark for a section), the
 * edition (the woodcut sun, the man in the moon, the globe) and Log out (a key).
 * The language is the stamp beside it in the bar (EditionSelector).
 */
function AccountMenu({ user }: { user: HeaderUser }) {
  const signOut = useSignOut();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  // The saved theme is only known in the browser.
  const mounted = useHydrated();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.nav.accountMenu}
        className="group inline-flex h-10 items-center gap-2 rounded-[3px] border-[3px] border-double border-rule/35 bg-card/60 py-1 pl-1 pr-2.5 transition-colors hover:border-(--ink-gold) hover:bg-card focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ColoredAvatar username={user.username} color={user.avatarColor} size="sm" />
        <span className="hidden max-w-36 truncate font-label text-[0.92rem] font-medium sm:inline">{user.username}</span>
        <span className="text-[0.7rem] text-(--ink-gold) transition-transform group-data-[state=open]:rotate-180" aria-hidden="true">
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5 font-normal">
          <ColoredAvatar username={user.username} color={user.avatarColor} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-tight">{user.username}</span>
            {user.email && <span className="block truncate text-[0.85rem] italic text-muted-foreground">{user.email}</span>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <span className="mr-3 flex w-6 shrink-0 justify-center font-display text-[1.2rem] leading-none text-(--brass-ink)" aria-hidden="true">
              §
            </span>
            {t.nav.settings}
            <span className="ml-auto pl-3 text-[0.78rem] italic text-muted-foreground">{t.nav.settingsNote}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="label pb-1 pt-2 text-muted-foreground">{t.nav.theEdition}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
          {EDITIONS.map(({ value, mark }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <MenuMark name={mark} />
              {t.nav.themes[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive [--ornament-ink:currentColor]">
          <MenuMark name="key" />
          {t.nav.logOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Morning or Night edition for visitors (signed-in readers find it in the account
 * menu): the woodcut sun or the man in the moon, whichever edition comes next.
 */
function EditionToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();
  const night = mounted && resolvedTheme === 'dark';
  const { t } = useI18n();
  const label = night ? t.nav.toMorning : t.nav.toNight;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(night ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      // Below 420px the bar cannot hold it beside the title, the edition and Log in in every edition;
      // visitors find Morning / Night first thing in Settings, a tab in the bottom bar there.
      className="h-10 w-9 px-0 [--ornament-ink:var(--brass-ink)] max-[419px]:hidden sm:w-10"
    >
      <Ornament name={night ? 'sun' : 'moon'} className="h-[1.35rem]" />
    </Button>
  );
}

/**
 * Settings for visitors (signed-in readers find it in the account menu): the §,
 * the printer's mark for a section, as in that menu. Visitors' settings are
 * kept in their browser (lib/guest-prefs.ts).
 */
function SettingsButton({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const active = isActive('/profile', pathname);
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn('hidden h-10 w-10 px-0 lg:inline-flex', active && 'bg-(--ink-gold)/15')}
    >
      <Link href="/profile" aria-label={t.nav.settings} title={t.nav.settings} aria-current={active ? 'page' : undefined}>
        <span className="font-display text-[1.5rem] leading-none text-(--brass-ink)" aria-hidden="true">
          §
        </span>
      </Link>
    </Button>
  );
}

/** The reader's places as ledger tabs: small capitals between hairline rules, the current one underlined in brass. */
function NavTabs({ user, pathname }: { user: HeaderUser | null; pathname: string }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t.nav.main} className="hidden h-10 items-stretch border-y border-rule/30 lg:flex">
      {navItems(user).map(({ href, icon }, index) => {
        const active = isActive(href, pathname);
        return (
          <span key={href} className="flex items-stretch">
            {index > 0 && <span className="my-2.5 w-px bg-rule/35" aria-hidden="true" />}
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2 whitespace-nowrap px-4 font-label text-[0.84rem] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                active
                  ? 'text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:border-y after:border-(--ink-gold)'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <TabIcon icon={icon} className={active ? 'text-(--brass-ink)' : undefined} />
              {t.nav[icon]}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

/** The same bar on every page: title on the left, the reader's places in the middle, the account on the right. */
export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const home = user ? '/feed' : '/';
  const bigMasthead = useBigMastheadVisible(pathname);
  const { t } = useI18n();

  return (
    <header className="paper sticky top-0 z-40 border-b border-border/60">
      {/* Phones: a 3.5rem bar and a one-line title small enough to sit beside the account (about 8.9 times its font size wide). */}
      <div className="container grid h-14 grid-cols-[1fr_auto] items-center gap-3 sm:h-16 sm:gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="min-w-0">
          {bigMasthead && (
            <div className="sm:hidden">
              <HeaderEdition />
            </div>
          )}
          <Masthead
            href={home}
            className={cn(
              'whitespace-nowrap text-[1.2rem] transition-opacity duration-300 min-[380px]:text-[1.3rem] min-[480px]:text-[1.45rem] sm:text-[1.8rem]',
              bigMasthead && 'pointer-events-none opacity-0 max-sm:hidden',
            )}
          />
        </div>
        <NavTabs user={user} pathname={pathname} />
        <div className="flex items-center justify-end gap-1 min-[400px]:gap-1.5 sm:gap-2">
          {/* The language of the paper: always here, on every page, for everyone. */}
          <EditionSelector />
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <>
              <EditionToggle />
              {/* Below 1024px Settings is a tab in the bottom bar (BottomNav). */}
              <SettingsButton pathname={pathname} />
              <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-[0.95rem] sm:px-4">
                <Link href="/login">{t.nav.logIn}</Link>
              </Button>
              {/* Desktop only: below 1024px the bar has room for the title, the edition, the moon and Log in in
                  every edition (a fourth button ran under the title), and the Log in page offers sign-up. */}
              <Button asChild size="sm" className="hidden h-10 px-5 text-[0.95rem] lg:inline-flex">
                <Link href="/signup">{t.nav.signUp}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Keeps a fixed bar on the bottom edge of what is actually on screen. Mobile browsers can leave the
 * layout viewport (what bottom: 0 means) taller than the visible area after a tab change, until the
 * next scroll: the bar then hangs below the screen and its labels are cut off. The visual viewport
 * says how much is hidden, and the bar is lifted by exactly that (nothing, normally).
 */
function useStayOnScreen(ref: React.RefObject<HTMLElement | null>, pathname: string) {
  useEffect(() => {
    const bar = ref.current;
    const viewport = window.visualViewport;
    if (!bar || !viewport) return;
    let frame = 0;
    const place = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Pinch-zoomed: leave the bar where it is, as browsers do.
        const hidden = viewport.scale > 1.01 ? 0 : Math.round(window.innerHeight - (viewport.offsetTop + viewport.height));
        bar.style.transform = hidden > 1 ? `translateY(-${hidden}px)` : '';
      });
    };
    place();
    // The browser may settle its toolbars a moment after the new page is drawn.
    const late = window.setTimeout(place, 400);
    viewport.addEventListener('resize', place);
    viewport.addEventListener('scroll', place);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(late);
      viewport.removeEventListener('resize', place);
      viewport.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [ref, pathname]);
}

/**
 * On phones and tablets the reader's places sit at the bottom of the screen, within reach of a thumb
 * (the header only has room for them, beside the title and the account, from 1024px).
 */
export function BottomNav({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const items = bottomItems(user);
  const { t } = useI18n();
  const navRef = useRef<HTMLElement>(null);
  useStayOnScreen(navRef, pathname);
  return (
    <>
      <div className="h-[4.5rem] lg:hidden" aria-hidden="true" />
      <nav
        ref={navRef}
        aria-label={t.nav.main}
        className="paper fixed inset-x-0 bottom-0 z-40 border-t border-border/70 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className={cn('mx-auto grid h-16 max-w-md', items.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {items.map(({ href, icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 font-label text-[0.8rem] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-[2px] border-[3px] border-double border-transparent transition-colors',
                    active && 'border-(--ink-gold) bg-(--ink-gold)/15 text-foreground',
                  )}
                >
                  <TabIcon icon={icon} className={cn(active && 'text-(--brass-ink)')} />
                </span>
                {t.nav[icon]}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
