'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bookmark, ChevronDown, LogOut, Monitor, Moon, Settings, Shield, SlidersHorizontal, Sun } from 'lucide-react';
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
import { editionDate, editionLabel, siteConfig } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export type HeaderUser = {
  email: string | null;
  username: string;
  avatarColor: string;
  isAdmin: boolean;
};

const READER_NAV = [
  { href: '/feed', label: 'Front Page' },
  { href: '/saved', label: 'Saved' },
  { href: '/onboarding', label: 'Sections' },
];

function useSignOut() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  };
}

/** The date is only rendered on the client to avoid a server/client mismatch around midnight. */
function EditionLine({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return (
    <span className={className} suppressHydrationWarning>
      {now ? editionDate(now) : ' '}
    </span>
  );
}

function AccountMenu({ user }: { user: HeaderUser }) {
  const signOut = useSignOut();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="group inline-flex items-center gap-2 outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ColoredAvatar username={user.username} color={user.avatarColor} size="sm" />
        <span className="label hidden max-w-40 truncate sm:inline">{user.username}</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-display text-base font-bold">{user.username}</p>
          {user.email && <p className="truncate text-xs italic text-muted-foreground">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/saved">
            <Bookmark className="mr-2 h-4 w-4" /> Saved stories
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> My sections
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/dashboard">
              <Shield className="mr-2 h-4 w-4" /> The newsroom (admin)
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="label pb-1 text-muted-foreground">Edition</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" /> Morning (light)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" /> Night (dark)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" /> Follow my device
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLinks({ user, pathname, className }: { user: HeaderUser | null; pathname: string; className?: string }) {
  const items = user
    ? [...READER_NAV, ...(user.isAdmin ? [{ href: '/admin/dashboard', label: 'Newsroom' }] : [])]
    : [
        { href: '/', label: "Today's Paper" },
        { href: '/login', label: 'Log in' },
        { href: '/signup', label: 'Sign up' },
      ];
  return (
    <nav aria-label="Main" className={cn('flex items-center', className)}>
      {items.map(({ href, label }, index) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href.split('/').slice(0, 2).join('/'));
        return (
          <span key={href} className="flex items-center">
            {index > 0 && <span className="mx-2.5 text-muted-foreground/60 sm:mx-4" aria-hidden="true">·</span>}
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'label whitespace-nowrap py-1 transition-colors hover:text-foreground',
                active ? 'text-foreground underline decoration-2 underline-offset-[6px]' : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

function GuestLinks() {
  return (
    <span className="flex items-center gap-3">
      <Link href="/login" className="label hover:underline">
        Log in
      </Link>
      <Link href="/signup" className="label border border-rule px-2 py-0.5 hover:bg-foreground hover:text-background">
        Sign up
      </Link>
    </span>
  );
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const frontPage = pathname === '/' || pathname === '/feed';
  const home = user ? '/feed' : '/';

  if (!frontPage) {
    // Inner pages: a slim, sticky masthead.
    return (
      <header className="paper sticky top-0 z-40">
        <div className="container">
          <div className="flex h-14 items-center gap-4">
            <Link href={home} className="font-display text-xl font-black uppercase leading-none tracking-tight sm:text-2xl">
              {siteConfig.masthead}
            </Link>
            <NavLinks user={user} pathname={pathname} className="ml-auto hidden md:flex" />
            <div className="ml-auto md:ml-6">{user ? <AccountMenu user={user} /> : <GuestLinks />}</div>
          </div>
          <div className="rule-double" />
          <NavLinks user={user} pathname={pathname} className="justify-center overflow-x-auto py-1.5 md:hidden" />
        </div>
      </header>
    );
  }

  return (
    <header>
      <div className="container">
        <div className="flex items-center justify-between gap-4 border-b border-rule py-2">
          <span className="label text-[0.62rem] text-muted-foreground">{editionLabel()}</span>
          <EditionLine className="label hidden text-[0.62rem] text-muted-foreground md:inline" />
          {user ? <AccountMenu user={user} /> : <GuestLinks />}
        </div>

        <div className="py-5 text-center sm:py-7">
          <Link
            href={home}
            className="font-display text-[2.35rem] font-black uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-[5.4rem]"
          >
            {siteConfig.masthead}
          </Link>
          <p className="mt-3 font-serif text-sm italic text-muted-foreground sm:text-base">“{siteConfig.motto}”</p>
        </div>

        <div className="rule-double" />
        <NavLinks user={user} pathname={pathname} className="justify-center overflow-x-auto py-2" />
        <div className="rule-double" />
      </div>
    </header>
  );
}
