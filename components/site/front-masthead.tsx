'use client';

import { useEffect, useRef } from 'react';
import { ClockTile, MoonTile } from '@/components/site/almanac';
import { EditionName } from '@/components/site/edition-selector';
import { StreetTheatre } from '@/components/site/street-theatre';
import { Masthead, MottoRibbon } from '@/components/site/logo';
import { FRONT_MASTHEAD_ID } from '@/components/site/site-header';
import { useI18n } from '@/lib/i18n/client';
import { editionLabel } from '@/lib/site';
import { useClientValue } from '@/lib/use-client-value';

/** The reader's local date, rendered in the browser only (the server may be in another time zone). */
function EditionDate() {
  const { dates } = useI18n();
  const date = useClientValue(() => dates.masthead(new Date()), null);
  return <span>{date ?? ' '}</span>;
}

/**
 * The lantern over the title: while a mouse or pen moves over the nameplate, its
 * position (relative to the panel, and to the title for the gilded sheen) goes
 * into CSS variables; styles/globals.css (.masthead-sky) lets the light glide
 * after it. One update per frame at most; touch is ignored (no hover), and with
 * reduced motion the light stays still in the middle.
 */
function useLantern() {
  const sky = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = sky.current;
    if (!panel) return;
    const title = panel.querySelector<HTMLElement>('.masthead-glow');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      const box = panel.getBoundingClientRect();
      panel.style.setProperty('--lx', `${x - box.left}px`);
      panel.style.setProperty('--ly', `${y - box.top}px`);
      if (title) {
        const letters = title.getBoundingClientRect();
        title.style.setProperty('--tx', `${x - letters.left}px`);
        title.style.setProperty('--ty', `${y - letters.top}px`);
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || still.matches) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    panel.addEventListener('pointermove', move);
    return () => {
      panel.removeEventListener('pointermove', move);
      cancelAnimationFrame(frame);
    };
  }, []);
  return sky;
}

/**
 * The front page's nameplate, in the grand frame: the edition line between
 * double rules, the blackletter title on its ribbon under a faint etched star
 * chart, the clock and tonight's moon as the nameplate's two "ears" (ruled
 * off left and right, as on old broadsheets), and the paper-theatre street.
 */
export function FrontMasthead({ home }: { home: string }) {
  const { t } = useI18n();
  const sky = useLantern();
  return (
    <section id={FRONT_MASTHEAD_ID} aria-label={t.masthead.label} className="card-ornate overflow-hidden">
      {/* Phones show this line in the header bar instead (site-header.tsx: HeaderEdition), so the title comes first. */}
      <div className="hidden flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-[3px] border-double border-rule/45 px-7 py-2.5 font-label text-[0.82rem] text-muted-foreground sm:flex sm:px-9">
        <span className="flex items-center gap-2.5">
          <span>{editionLabel(new Date(), t.masthead.volNo)}</span>
          <span className="text-[0.55rem] text-(--ink-gold)" aria-hidden="true">
            ◆
          </span>
          {/* The language of the paper, printed; the stamp in the header bar changes it. */}
          <EditionName />
        </span>
        <EditionDate />
      </div>

      <div className="grid lg:grid-cols-[14rem_minmax(0,1fr)_14rem]">
        <ClockTile layout="ear" className="hidden border-r border-rule/40 lg:flex" />
        <div ref={sky} className="masthead-sky relative min-w-0 px-4 pb-3 pt-4 text-center sm:px-6 sm:pb-6 sm:pt-7">
          <span className="star-chart pointer-events-none absolute inset-0" aria-hidden="true" />
          {/* Pointed at: a lantern follows the cursor and lights up the chart around it in gilt. */}
          <span className="star-chart-lit" aria-hidden="true" />
          <span className="masthead-lantern" aria-hidden="true" />
          {/* Sized so the title stays on one line (it is about 8.9 times as wide as its font size). */}
          <Masthead
            href={home}
            className="relative text-[1.85rem] min-[400px]:text-[2.05rem] sm:text-[3.2rem] md:text-[4.1rem] lg:text-[3.3rem] xl:text-[4.6rem]"
          />
          <div className="relative">
            <MottoRibbon className="w-[14.5rem] min-[400px]:w-[16rem]" />
          </div>
          {/* Phones have no edition line, so the edition is printed under the ribbon. */}
          <div className="relative mt-1.5 flex justify-center font-label text-[0.82rem] text-muted-foreground sm:hidden">
            <EditionName />
          </div>
        </div>
        <MoonTile layout="ear" className="hidden border-l border-rule/40 lg:flex" />
      </div>

      {/* Tablets: the two ears sit side by side under the title; phones have no room for them. */}
      <div className="hidden grid-cols-2 divide-x divide-rule/40 border-t border-rule/40 py-3 sm:grid lg:hidden">
        <ClockTile className="justify-center" />
        <MoonTile className="justify-center" />
      </div>

      {/* Readers can hide the street (Settings > The reading room); styles: .masthead-street. */}
      <div className="masthead-street border-t-[3px] border-double border-rule/45">
        <StreetTheatre />
      </div>
    </section>
  );
}
