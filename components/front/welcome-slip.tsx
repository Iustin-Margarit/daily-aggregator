'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/client';
import { LOGIN_PATH, SECTIONS_PATH } from '@/lib/routes';
import { useClientValue } from '@/lib/use-client-value';
import type { WelcomePlate } from '@/lib/welcome-plates';

const SEEN_KEY = 'welcome-slip';
/** Shown on a visitor's first few visits at most, and never again once closed. */
const SHOW_TIMES = 3;

function readSeen(): number {
  try {
    return Number.parseInt(localStorage.getItem(SEEN_KEY) ?? '0', 10) || 0;
  } catch {
    return SHOW_TIMES; // no storage: do not nag on every page
  }
}
// Read once per page load, so counting this visit does not hide the slip while it is being read.
let seenAtLoad: number | null = null;
const readSeenOnce = () => (seenAtLoad ??= readSeen());
let counted = false;

function writeSeen(value: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(value));
  } catch {
    // Storage refused (some private windows): the slip simply shows less.
  }
}

/**
 * A short welcome for a visitor's first visits, printed as a slip tucked into the
 * paper under the top stories: what this paper is, one of five paintings of
 * people reading the paper (lib/welcome-plates.ts), and Browse the sections.
 * Kept in this browser; signed-in readers never see it.
 */
export function WelcomeSlip({ plate, papers }: { plate: WelcomePlate; papers: number }) {
  const { t, fmt, rich } = useI18n();
  // Nothing on the server (it cannot know); in the browser, shown while this visitor has seen it fewer than three times.
  const seen = useClientValue(readSeenOnce, SHOW_TIMES);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (seen >= SHOW_TIMES || counted) return;
    counted = true; // this visit counts once
    writeSeen(seen + 1);
  }, [seen]);
  if (closed || seen >= SHOW_TIMES) return null;

  const close = () => {
    writeSeen(SHOW_TIMES);
    setClosed(true);
  };
  const picture = t.landing.pictures[plate.key];

  return (
    <aside aria-labelledby="welcome-title" className="card-paper relative mt-10 grid grid-cols-1 items-center gap-5 p-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)_auto] lg:gap-8">
      <figure className="hidden sm:block">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
        <img
          src={`/plates/${plate.key}.webp`}
          alt={picture.alt}
          width={1000}
          height={800}
          loading="lazy"
          className="aspect-[5/4] w-full rounded-[2px] border border-rule/40 bg-card object-cover p-1.5 shadow-paper"
          style={{ objectPosition: plate.focus }}
        />
      </figure>
      <div className="min-w-0">
        <p className="kicker text-balance">{t.landing.kicker}</p>
        <h2 id="welcome-title" className="headline mt-1 text-balance text-[1.5rem] sm:text-[1.9rem]">
          {t.landing.title}
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-[1rem] leading-relaxed text-foreground/85">{fmt(t.landing.intro, { count: papers })}</p>
        <p className="mt-2 text-pretty text-[0.92rem] italic text-muted-foreground">
          {rich(t.landing.guestNote, {
            account: (
              <Link href={LOGIN_PATH} className="font-medium not-italic text-foreground underline decoration-(--ink-gold) underline-offset-4 hover:decoration-2">
                {t.landing.account}
              </Link>
            ),
          })}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-1 lg:flex-col">
        <Button asChild size="lg" className="h-auto min-h-12 max-w-full whitespace-normal py-2.5 text-center">
          <Link href={SECTIONS_PATH} onClick={close}>
            {t.landing.choose}
          </Link>
        </Button>
        <Button size="lg" variant="outline" className="h-auto min-h-12 max-w-full whitespace-normal py-2.5" onClick={close}>
          {t.front.welcomeClose}
        </Button>
      </div>
    </aside>
  );
}
