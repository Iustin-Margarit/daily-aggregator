'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
import { createClient } from '@/lib/supabase/client';
import { useHydrated } from '@/lib/use-client-value';
import { cn } from '@/lib/utils';

export type HeaderUser = {
  email: string | null;
  username: string;
  avatarColor: string;
  isAdmin: boolean;
};

/** The reader's three places, in the same spot on every page. */
type NavIcon = 'front' | 'saved' | 'sections' | 'newsroom';

const READER_NAV: { href: string; label: string; icon: NavIcon }[] = [
  { href: '/feed', label: 'Front Page', icon: 'front' },
  { href: '/saved', label: 'Saved', icon: 'saved' },
  { href: '/onboarding', label: 'Sections', icon: 'sections' },
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
      {icon === 'front' ? (
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
    router.replace('/login');
    router.refresh();
  };
}

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navItems(user: HeaderUser | null) {
  return user?.isAdmin ? [...READER_NAV, { href: '/admin/dashboard', label: 'Newsroom', icon: 'newsroom' as const }] : READER_NAV;
}

/**
 * True while the big masthead of a front page is on screen, so the small title
 * in the bar does not repeat it. Pages without one always get the small title.
 */
function useBigMastheadVisible(pathname: string) {
  const [seen, setSeen] = useState<{ path: string; visible: boolean } | null>(null);
  useEffect(() => {
    const target = document.getElementById(FRONT_MASTHEAD_ID);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setSeen({ path: pathname, visible: entry.isIntersecting }), {
      rootMargin: '-64px 0px 0px 0px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [pathname]);
  // Before the first observation, assume the front pages show their big masthead.
  return seen?.path === pathname ? seen.visible : pathname === '/' || pathname === '/feed';
}

/** An engraved ornament at the head of a menu line, in brass. */
function MenuMark({ name }: { name: OrnamentName }) {
  return (
    <span className="mr-3 flex w-6 shrink-0 justify-center" aria-hidden="true">
      <Ornament name={name} className="h-[1.15rem] max-w-6" />
    </span>
  );
}

const EDITIONS: { value: string; label: string; mark: OrnamentName }[] = [
  { value: 'light', label: 'Morning edition', mark: 'sun' },
  { value: 'dark', label: 'Night edition', mark: 'moon' },
  { value: 'system', label: 'Like my device', mark: 'globe' },
];

/**
 * The account menu, printed like the rest of the paper: the reader's seal and
 * byline at its head, then Settings (§, the printer's mark for a section), the
 * edition (the woodcut sun, the man in the moon, the globe) and Log out (a key).
 */
function AccountMenu({ user }: { user: HeaderUser }) {
  const signOut = useSignOut();
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser.
  const mounted = useHydrated();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
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
            Settings
            <span className="ml-auto pl-3 text-[0.78rem] italic text-muted-foreground">the reader’s ledger</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="label pb-1 pt-2 text-muted-foreground">The edition</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
          {EDITIONS.map(({ value, label, mark }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <MenuMark name={mark} />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive [--ornament-ink:currentColor]">
          <MenuMark name="key" />
          Log out
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
  const label = night ? 'Switch to the Morning edition' : 'Switch to the Night edition';
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(night ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="h-10 w-10 px-0 [--ornament-ink:var(--brass-ink)]"
    >
      <Ornament name={night ? 'sun' : 'moon'} className="h-[1.35rem]" />
    </Button>
  );
}

/** The reader's places as ledger tabs: small capitals between hairline rules, the current one underlined in brass. */
function NavTabs({ user, pathname }: { user: HeaderUser | null; pathname: string }) {
  return (
    <nav aria-label="Main" className="hidden h-10 items-stretch border-y border-rule/30 md:flex">
      {navItems(user).map(({ href, label, icon }, index) => {
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
              {label}
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

  return (
    <header className="paper sticky top-0 z-40 border-b border-border/60">
      <div className="container grid h-16 grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="min-w-0">
          <Masthead
            href={home}
            className={cn(
              'text-[1.6rem] transition-opacity duration-300 sm:text-[1.8rem]',
              bigMasthead && 'pointer-events-none opacity-0',
            )}
          />
        </div>
        <NavTabs user={user} pathname={pathname} />
        <div className="flex items-center justify-end gap-2">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <>
              <EditionToggle />
              <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-[0.95rem] sm:px-4">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="hidden h-10 px-5 text-[0.95rem] sm:inline-flex">
                <Link href="/signup">Sign up free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** On phones the reader's places sit at the bottom of the screen, within reach of a thumb. */
export function BottomNav({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const items = navItems(user);
  return (
    <>
      <div className="h-[4.5rem] md:hidden" aria-hidden="true" />
      <nav
        aria-label="Main"
        className="paper fixed inset-x-0 bottom-0 z-40 border-t border-border/70 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className={cn('mx-auto grid h-16 max-w-md', items.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {items.map(({ href, label, icon }) => {
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
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
