'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Rss, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/sources', label: 'Wire services', icon: Rss },
  { href: '/admin/users', label: 'Readers', icon: Users },
];

export function AdminNav({ variant }: { variant: 'sidebar' | 'back' }) {
  const pathname = usePathname();

  if (variant === 'back') {
    return (
      <Link href="/feed" className="label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the paper
      </Link>
    );
  }

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Newsroom">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-[3px] px-4 py-2 font-label text-[0.95rem] font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
