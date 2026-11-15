'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { EditionSelector } from '@/components/site/edition-selector';
import { Engraving } from '@/components/site/engraving';
import { Masthead } from '@/components/site/logo';
import { Ornament, type OrnamentName } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import { Phrases } from '@/components/ui/phrases';
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
        // An engraved cogwheel and its pinion, as for Settings in the account menu.
        <Ornament name="gear" className={cn('h-[1.05rem]', ink)} />
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
    // Follow the masthead element itself: on a front page it may arrive after the loading skeleton, or be
    // replaced while the page streams in (the night edition did: the bar then watched a detached copy and
    // printed the small title over the big one). Cheap: one lookup by id per change to the page's elements.
    let observed: Element | null = null;
    const watch = () => {
      const target = document.getElementById(FRONT_MASTHEAD_ID);
      if (target === observed) return;
      if (observed) observer.unobserve(observed);
      observed = target;
      if (target) observer.observe(target);
    };
    watch();
    const following = pathname === '/' || pathname === '/feed' ? new MutationObserver(watch) : null;
    following?.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      following?.disconnect();
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
      {/* Breaks only between Vol. and No. (never before a lone number) when the bar is narrow. */}
      <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.08em] min-[400px]:text-[0.74rem] min-[400px]:tracking-[0.13em]">
        <Phrases text={editionLabel(new Date(), t.masthead.volNo)} />
      </span>
      <span className="block text-balance text-[0.8rem] min-[400px]:text-[0.82rem]">{date ?? ' '}</span>
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
 * byline at its head, then Settings (an engraved cogwheel), the
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
            <span className="mr-3 flex w-6 shrink-0 justify-center [--ornament-ink:var(--brass-ink)]" aria-hidden="true">
              <Ornament name="gear" className="h-[0.95rem]" />
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
      // On every width: on phones the bar's title shrinks to leave it room (SiteHeader).
      className="h-10 w-8 shrink-0 px-0 [--ornament-ink:var(--brass-ink)] min-[400px]:w-9 sm:w-10"
    >
      <Ornament name={night ? 'sun' : 'moon'} className="h-[1.35rem]" />
    </Button>
  );
}

/**
 * Settings for visitors (signed-in readers find it in the account menu): an engraved
 * cogwheel and its pinion, as in that menu, with a tooltip saying what is inside. Visitors' settings are
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
      <Link href="/profile" aria-label={t.nav.settings} title={t.nav.settingsHint} aria-current={active ? 'page' : undefined}>
        <Ornament name="gear" className="h-[1.2rem] [--ornament-ink:var(--brass-ink)]" />
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
                'relative flex items-center gap-2 whitespace-nowrap px-3 font-label xl:px-4 text-[0.84rem] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
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
      {/* Phones: a 3.5rem bar; the buttons on the right keep their size and the title takes the rest. */}
      <div className="container grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 min-[400px]:gap-3 sm:h-16 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)]">
        {/* A size container: the title is about 8.9 times as wide as its font size, so a font size of at most
            10.8% of the cell's width (cqi) always fits on one line beside the buttons, in every edition. From
            1024px the two sides share the room equally (the tabs centred) until the buttons need more; then the
            title gives way, never the buttons. */}
        <div className="@container min-w-0">
          {bigMasthead && (
            <div className="sm:hidden">
              <HeaderEdition />
            </div>
          )}
          <Masthead
            href={home}
            className={cn(
              'whitespace-nowrap text-[min(1.3rem,10.8cqi)] transition-opacity duration-300 min-[480px]:text-[min(1.45rem,10.8cqi)] sm:text-[min(1.8rem,10.8cqi)]',
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
              {/* Phones print the short name ("Entrar" for "Iniciar sesión"), so the title keeps a readable size. */}
              <Button asChild variant="ghost" size="sm" className="h-10 shrink-0 whitespace-nowrap px-1.5 text-[0.88rem] min-[400px]:px-2 min-[400px]:text-[0.92rem] sm:px-4 sm:text-[0.95rem]">
                <Link href="/login">
                  <span className="sm:hidden">{t.nav.logInShort}</span>
                  <span className="max-sm:hidden">{t.nav.logIn}</span>
                </Link>
              </Button>
              {/* From 1280px: below that the bar has room for the title, the tabs, the edition, Morning / Night,
                  Settings and Log in in every edition, not a sixth button (it ran under the title at 1024px),
                  and the Log in page offers sign-up. */}
              <Button asChild size="sm" className="hidden h-10 px-5 text-[0.95rem] xl:inline-flex">
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
 * On phones and tablets the reader's places sit at the bottom of the screen, within reach of a thumb
 * (the header only has room for them, beside the title and the account, from 1024px).
 *
 * Pinned by CSS alone (fixed, bottom 0, safe-area padding), so the browser keeps it on the bottom edge
 * while its address bar slides in and out. A script that lifted it by the visual viewport's height
 * left it hanging above the page on Android whenever the page was a little wider than the screen.
 * Its ancestors (.sheet, the paper) must stay free of transform, filter and contain, or fixed would
 * follow them instead of the screen.
 */
export function BottomNav({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const items = bottomItems(user);
  const { t } = useI18n();
  return (
    <>
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      <nav
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
