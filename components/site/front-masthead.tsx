'use client';

import { ClockTile, EditionLanguage, MoonTile } from '@/components/site/almanac';
import { StreetTheatre } from '@/components/site/street-theatre';
import { Masthead, MottoRibbon } from '@/components/site/logo';
import { FRONT_MASTHEAD_ID } from '@/components/site/site-header';
import { editionDate, editionLabel } from '@/lib/site';
import { useClientValue } from '@/lib/use-client-value';

/** The reader's local date, rendered in the browser only (the server may be in another time zone). */
function EditionDate() {
  const date = useClientValue(() => editionDate(new Date()), null);
  return <span>{date ?? ' '}</span>;
}

/**
 * The front page's nameplate, in the grand frame: the edition line between
 * double rules, the blackletter title on its ribbon under a faint etched star
 * chart, the clock and tonight's moon as the nameplate's two "ears" (ruled
 * off left and right, as on old broadsheets), and the paper-theatre street.
 */
export function FrontMasthead({ home }: { home: string }) {
  return (
    <section id={FRONT_MASTHEAD_ID} aria-label="Masthead" className="card-ornate overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-[3px] border-double border-rule/45 px-7 py-2.5 font-label text-[0.82rem] text-muted-foreground sm:px-9">
        <span className="flex items-center gap-2.5">
          <span>{editionLabel()}</span>
          <span className="text-[0.55rem] text-(--ink-gold)" aria-hidden="true">
            ◆
          </span>
          <EditionLanguage />
        </span>
        <EditionDate />
      </div>

      <div className="grid lg:grid-cols-[14rem_minmax(0,1fr)_14rem]">
        <ClockTile layout="ear" className="hidden border-r border-rule/40 lg:flex" />
        <div className="relative min-w-0 px-5 pb-6 pt-7 text-center sm:px-6">
          <span className="star-chart pointer-events-none absolute inset-0" aria-hidden="true" />
          {/* Sized so the title stays on one line (it is about 8.9 times as wide as its font size). */}
          <Masthead href={home} className="relative text-[2rem] sm:text-[3.2rem] md:text-[4.1rem] lg:text-[3.3rem] xl:text-[4.6rem]" />
          <div className="relative">
            <MottoRibbon />
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
