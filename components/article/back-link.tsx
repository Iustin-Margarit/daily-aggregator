'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ornament } from '@/components/site/ornament';

/** Goes back when the reader came from inside the app, otherwise to the feed. A printer's fist points the way (☜). */
export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/feed"
      onClick={(event) => {
        if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
          event.preventDefault();
          router.back();
        }
      }}
      className="group/read inline-flex h-10 items-center gap-2.5 rounded-[3px] border border-rule/50 bg-card/70 px-4 font-display text-[0.95rem] font-semibold text-muted-foreground shadow-[inset_0_0_0_2px_hsl(var(--card)),inset_0_0_0_3px_hsl(var(--rule)/0.22)] transition-colors hover:border-(--ink-gold) hover:bg-card hover:text-foreground"
    >
      <span className="-scale-x-100">
        <Ornament name="fist" className="fist-poke block w-[1.35rem] [--ornament-ink:var(--action-icon)]" />
      </span>
      Back to the paper
    </Link>
  );
}
