import Link from 'next/link';
import { siteConfig } from '@/lib/site';
import { cn } from '@/lib/utils';

/** The masthead title as a link (used on auth, setup and admin pages). */
export function Logo({ href = '/', className }: { href?: string; className?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn('font-display text-2xl font-black uppercase leading-none tracking-tight', className)}>
      {siteConfig.masthead}
    </Link>
  );
}
