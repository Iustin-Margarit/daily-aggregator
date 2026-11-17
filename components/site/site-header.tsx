'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { accentVariables } from '@/lib/colors';
import { stayOnCurrentPage } from '@/lib/current-page';
import { useTheme } from '@/components/site/theme-provider';
import type { ThemeChoice } from '@/lib/theme';
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
import { FRONT_PATH, SEARCH_PATH, SECTIONS_PATH, SETTINGS_PATH, isPaperPath, loginPath } from '@/lib/routes';

export type HeaderUser = {
  email: string | null;
  username: string;
  /** The reader's accent ink (their seal is printed in it). */
  accent: string | null;
  isAdmin: boolean;
};

/** The reader's three places, in the same spot on every page. */
type NavIcon = 'front' | 'saved' | 'sections' | 'newsroom' | 'settings';

const READER_NAV: { href: string; icon: NavIcon }[] = [
  { href: FRONT_PATH, icon: 'front' },
  { href: '/saved', icon: 'saved' },
  { href: SECTIONS_PATH, icon: 'sections' },
];

/**
 * Each tab's small engraving, printed in the tab's ink (currentColor, brass when
 * current): a folded broadsheet, a quill, the Penny Black and the printing press.
 */
function TabIcon({ icon, className, fixed = false }: { icon: NavIcon; className?: string; fixed?: boolean }) {
  // Printed in the tab's ink; the wrapper's hairline shadow thickens the fine lines a little
  // (a filter on the masked drawing itself would be masked away).
  const ink = 'block [--ornament-ink:currentColor] [--engraving-ink:currentColor]';
  return (
    // Sized in em from a 1rem base; the bottom bar sets 16px so its icons never follow Type size.
    <span className={cn('inline-flex shrink-0 drop-shadow-[0_0_0.4px_currentColor]', className)} style={{ fontSize: fixed ? '16px' : '1rem' }} aria-hidden="true">
      {icon === 'settings' ? (
        // An engraved cogwheel and its pinion, as for Settings in the account menu.
        <Ornament name="gear" className={cn('h-[1.05em]', ink)} />
      ) : icon === 'front' ? (
        <Ornament name="broadsheet" className={cn('h-[1.15em]', ink)} />
      ) : icon === 'sections' ? (
        <Ornament name="stamp" className={cn('h-[1.3em]', ink)} />
      ) : (
        <Engraving name={icon === 'saved' ? 'quill' : 'press'} className={cn(icon === 'saved' ? 'h-[1.55em]' : 'h-[1.35em]', ink)} />
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
    router.replace(FRONT_PATH);
    router.refresh();
  };
}

function isActive(href: string, pathname: string) {
  // A section or a search is still the paper: the Front Page tab stays lit.
  if (href === FRONT_PATH) return isPaperPath(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navItems(user: HeaderUser | null) {
  return user?.isAdmin ? [...READER_NAV, { href: '/admin/dashboard', icon: 'newsroom' as const }] : READER_NAV;
}

/** The bottom bar: the same places, plus Settings for visitors (signed-in readers have it in the account menu). */
function bottomItems(user: HeaderUser | null): { href: string; icon: NavIcon }[] {
  return user ? navItems(user) : [...READER_NAV, { href: SETTINGS_PATH, icon: 'settings' }];
}

/**
 * True while the front page's big masthead is on screen, so the small title
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
    const following = pathname === FRONT_PATH ? new MutationObserver(watch) : null;
    following?.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      following?.disconnect();
    };
  }, [pathname]);
  // Before the first observation, assume the front page shows its big masthead (only it has one).
  return seen?.path === pathname ? seen.visible : pathname === FRONT_PATH;
}

/**
 * Phones, at the top of the front page: the edition line (Vol. · No. and the
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

const EDITIONS: { value: ThemeChoice; mark: OrnamentName }[] = [
  { value: 'light', mark: 'sun' },
  { value: 'dark', mark: 'moon' },
  { value: 'auto', mark: 'watch-case' },
];

/**
 * The account menu, printed like the rest of the paper: the reader's seal and
 * byline at its head, then Settings (an engraved cogwheel), the
 * edition (the woodcut sun, the man in the moon, the globe) and Log out (a key).
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
        className="group inline-flex h-10 items-center gap-2 frame-double rounded-[3px] py-1 pl-1 pr-2.5 transition-colors hover:bg-card focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ColoredAvatar username={user.username} size="sm" />
        <span className="hidden max-w-36 truncate font-label text-[0.92rem] font-medium sm:inline">{user.username}</span>
        <span className="text-[0.7rem] text-(--ink-gold) transition-transform group-data-[state=open]:rotate-180" aria-hidden="true">
          ▾
        </span>
      </DropdownMenuTrigger>
      {/* The menu opens outside the paper's element, so it carries the reader's ink itself (for the seal). */}
      <DropdownMenuContent align="end" className="w-72" data-accent="" style={accentVariables(user.accent)}>
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5 font-normal">
          <ColoredAvatar username={user.username} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-tight">{user.username}</span>
            {user.email && <span className="block truncate text-[0.85rem] italic text-muted-foreground">{user.email}</span>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={SETTINGS_PATH}>
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
      // On every width. Phones: a framed 44px button (40px below 360px, beside Search and Log in) like Log in; the
      // bar's title shrinks to leave them room (SiteHeader).
      className="h-10 w-10 min-[360px]:h-11 min-[360px]:w-11 shrink-0 frame-double rounded-[3px] px-0 [--ornament-ink:var(--brass-ink)] sm:h-10 sm:w-10 sm:border-transparent sm:bg-transparent"
    >
      <Ornament name={night ? 'sun' : 'moon'} className="h-[1.45rem] sm:h-[1.35rem]" />
    </Button>
  );
}

/**
 * Search, for everyone, always one press away in the bar (it used to be a ticket in the section ribbon, which
 * left the sections too little room on phones): the brass magnifier in a framed square like the edition button
 * beside it; from 640px a plain button like Settings. Lit on the search page.
 */
function SearchButton({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const active = pathname === SEARCH_PATH;
  return (
    <Link
      href={SEARCH_PATH}
      aria-label={t.toolbar.searchTab}
      title={t.toolbar.searchLabel}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => stayOnCurrentPage(event, SEARCH_PATH)}
      className={cn(
        'inline-flex h-10 w-10 min-[360px]:h-11 min-[360px]:w-11 shrink-0 items-center justify-center frame-double rounded-[3px] text-foreground [--ornament-ink:var(--brass-ink)] transition-colors hover:bg-card focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-10 sm:w-10 sm:border-transparent sm:bg-transparent',
        active && 'bg-(--ink-gold)/15 sm:bg-(--ink-gold)/15',
      )}
    >
      {/* The engraved magnifier's lines are fine: a hairline shadow in its own ink, twice, thickens them to the weight of
          the sun and cogwheel beside it (on a wrapper: a filter on the masked drawing itself would be masked away). */}
      <span className="inline-flex [filter:drop-shadow(0_0_0.5px_var(--brass-ink))_drop-shadow(0_0_0.5px_var(--brass-ink))]" aria-hidden="true">
        <Ornament name="magnifier" className="h-[1.55rem] -rotate-[30deg] sm:h-[1.7rem]" />
      </span>
    </Link>
  );
}

/**
 * Settings for visitors (signed-in readers find it in the account menu): an engraved
 * cogwheel and its pinion, as in that menu, with a tooltip saying what is inside. Visitors' settings are
 * kept in their browser (lib/guest-prefs.ts).
 */
function SettingsButton({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const active = isActive(SETTINGS_PATH, pathname);
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn('hidden h-10 w-10 px-0 lg:inline-flex', active && 'bg-(--ink-gold)/15')}
    >
      <Link href={SETTINGS_PATH} aria-label={t.nav.settings} title={t.nav.settingsHint} aria-current={active ? 'page' : undefined} onClick={(event) => stayOnCurrentPage(event, SETTINGS_PATH)}>
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
              onClick={(event) => stayOnCurrentPage(event, href)}
              className={cn(
                'relative flex items-center gap-2 whitespace-nowrap px-2.5 font-label text-[0.84rem] font-semibold uppercase tracking-[0.1em] transition-colors xl:px-4 xl:tracking-[0.12em] focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
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
  const bigMasthead = useBigMastheadVisible(pathname);
  const { t } = useI18n();

  return (
    <header className="paper sticky top-0 z-40 border-b border-border/60">
      {/* Phones: a 3.5rem bar; the buttons on the right keep their size and the title takes the rest. */}
      <div className="chrome-scale container grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 min-[400px]:gap-3 sm:h-16 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)]">
        {/* A size container: the title is about 8.9 times as wide as its font size, so a font size of at most
            10.8% of the cell's width (cqi) always fits on one line beside the buttons. From
            1024px the two sides share the room equally (the tabs centred) until the buttons need more; then the
            title gives way, never the buttons. */}
        <div className="@container min-w-0">
          {bigMasthead && (
            <div className="sm:hidden">
              <HeaderEdition />
            </div>
          )}
          <Masthead
            href={FRONT_PATH}
            className={cn(
              'whitespace-nowrap text-[min(1.3rem,10.8cqi)] transition-opacity duration-300 min-[480px]:text-[min(1.45rem,10.8cqi)] sm:text-[min(1.8rem,10.8cqi)]',
              bigMasthead && 'pointer-events-none opacity-0 max-sm:hidden',
            )}
          />
        </div>
        <NavTabs user={user} pathname={pathname} />
        <div className="flex items-center justify-end gap-1 min-[400px]:gap-1.5 sm:gap-2 lg:gap-1.5 xl:gap-2">
          <SearchButton pathname={pathname} />
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <>
              <EditionToggle />
              {/* Below 1024px Settings is a tab in the bottom bar (BottomNav). */}
              <SettingsButton pathname={pathname} />
              {/* Phones: a framed button with an engraved key (a fixed width, so the title
                  keeps its size); its name is read out and shown as a tooltip. From 640px: the words. */}
              {/* Log in brings the reader back to this page afterwards (new account or not). */}
              <Link
                href={loginPath(pathname)}
                aria-label={t.nav.logIn}
                title={t.nav.logIn}
                className="inline-flex h-10 w-10 min-[360px]:h-11 min-[360px]:w-11 shrink-0 items-center justify-center frame-double rounded-[3px] text-foreground [--ornament-ink:var(--brass-ink)] transition-colors hover:bg-card focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
              >
                <Ornament name="key" className="h-[0.9rem] -rotate-[30deg]" />
              </Link>
              <Button asChild variant="ghost" size="sm" className="hidden h-10 shrink-0 whitespace-nowrap px-4 text-[0.95rem] sm:inline-flex">
                <Link href={loginPath(pathname)}>{t.nav.logIn}</Link>
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
      {/* Room under the footer: the bar's height plus a margin, so the last lines are never under it. */}
      <div className="h-[calc(56px+24px+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      <nav
        aria-label={t.nav.main}
        // Its paper also runs on below its bottom edge (::after): if a browser ever leaves the bar a few pixels above
        // the screen's edge (its address bar sliding, a bounce at the end of the page), paper shows there, not the page.
        className="paper fixed inset-x-0 bottom-0 z-40 border-t border-border/70 pb-[env(safe-area-inset-bottom)] after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-32 after:bg-background lg:hidden"
      >
        {/* Sized in px, not rem: one height (56px) and one-line labels whatever the Type size or zoom. */}
        <div className={cn('mx-auto grid h-[56px] max-w-md', items.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {items.map(({ href, icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => stayOnCurrentPage(event, href)}
                className={cn(
                  'flex h-[56px] min-w-0 flex-col items-center justify-center gap-[3px] whitespace-nowrap px-0.5 font-label text-[11px] font-medium leading-[14px] transition-colors min-[360px]:text-[12px]',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-[28px] w-[46px] shrink-0 items-center justify-center rounded-[2px] border-[3px] border-double border-transparent transition-colors',
                    active && 'border-(--ink-gold) bg-(--ink-gold)/15 text-foreground',
                  )}
                >
                  <TabIcon icon={icon} fixed className={cn(active && 'text-(--brass-ink)')} />
                </span>
                <span className="block max-w-full">{t.nav[icon]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
