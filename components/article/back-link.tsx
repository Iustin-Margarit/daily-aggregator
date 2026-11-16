'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { previousAppPath } from '@/components/site/navigation-tracker';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { FRONT_PATH } from '@/lib/routes';

/** Pages to step over: going back should not land on Log in again. */
const AUTH_PAGES = /^\/login(\/|$)/;

/**
 * Goes back when the reader came from a reading page of the app, otherwise to `href` (the feed on articles,
 * the front page on the Log in pages). A printer's fist points the way (☜).
 */
export function BackLink({ href = FRONT_PATH, className }: { href?: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Link
      href={href}
      onClick={(event) => {
        // Back to where the reader was (the page of stories they were on, say page 2) when they came from
        // another page of the paper in this tab; otherwise to `href`.
        const from = previousAppPath();
        if (window.history.length > 1 && from !== null && !AUTH_PAGES.test(from)) {
          event.preventDefault();
          router.back();
        }
      }}
      className={cn(
        'group/read inline-flex h-10 items-center gap-2.5 frame-ruled rounded-[3px] px-4 font-display text-[0.95rem] font-semibold text-muted-foreground transition-colors hover:text-foreground',
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
