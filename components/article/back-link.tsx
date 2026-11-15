'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/** Pages to step over: going back from Sign up should not land on Log in. */
const AUTH_PAGES = /^\/(login|signup|forgot-password|update-password|email-confirmed)(\/|$)/;

/**
 * Goes back when the reader came from a reading page of the app, otherwise to `href` (the feed on articles,
 * the front page on the Log in pages). A printer's fist points the way (☜).
 */
export function BackLink({ href = '/feed', className }: { href?: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Link
      href={href}
      onClick={(event) => {
        const from = document.referrer.startsWith(window.location.origin) ? new URL(document.referrer).pathname : null;
        if (window.history.length > 1 && from !== null && !AUTH_PAGES.test(from)) {
          event.preventDefault();
          router.back();
        }
      }}
      className={cn(
        'group/read inline-flex h-10 items-center gap-2.5 rounded-[3px] border border-rule/50 bg-card/70 px-4 font-display text-[0.95rem] font-semibold text-muted-foreground shadow-[inset_0_0_0_2px_hsl(var(--card)),inset_0_0_0_3px_hsl(var(--rule)/0.22)] transition-colors hover:border-(--ink-gold) hover:bg-card hover:text-foreground',
        className,
      )}
    >
      <span className="-scale-x-100">
        <Ornament name="fist" className="fist-poke block w-[1.35rem] [--ornament-ink:var(--action-icon)]" />
      </span>
      {t.article.back}
    </Link>
  );
}
