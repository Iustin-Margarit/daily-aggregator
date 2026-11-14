'use client';

import { useSyncExternalStore } from 'react';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import type { OnThisDay } from '@/lib/on-this-day';
import { formatClock } from '@/lib/reader-prefs';
import { useClientValue } from '@/lib/use-client-value';
import { useReaderPref } from '@/lib/use-reader-pref';
import { cn } from '@/lib/utils';

/*
 * Small printed details with some soul: a live clock, tonight's moon, the
 * month's woodcut with a thought for the day, and the edition's language
 * under an engraved globe. The time, moon and month use the reader's own
 * clock, so they only appear after the page loads.
 */

// ---------------------------------------------------------------- time source

function subscribeSeconds(listener: () => void) {
  const timer = window.setInterval(listener, 1000);
  return () => window.clearInterval(timer);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);

/** Seconds since 1970, ticking once a second; null on the server. */
function useNow(): number | null {
  return useSyncExternalStore(subscribeSeconds, nowInSeconds, () => null);
}

// ---------------------------------------------------------------- tile

/**
 * One almanac item: a round picture and three lines (label, value, note). The
 * clock and the moon both use it, so they always match. As an "ear" it stands
 * in a column beside the title, like the weather box of an old nameplate; as a
 * "row" (tablets) the picture sits beside the text.
 */
export function AlmanacTile({
  picture,
  label,
  value,
  note,
  layout = 'row',
  className,
}: {
  picture: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  layout?: 'ear' | 'row';
  className?: string;
}) {
  if (layout === 'ear') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 px-3 py-5 text-center', className)}>
        <p className="section-head w-full whitespace-nowrap font-label text-[0.68rem] tracking-[0.18em] text-muted-foreground">{label}</p>
        <div className="flex h-[4.6rem] w-[4.6rem] items-center justify-center">{picture}</div>
        <div className="leading-tight">
          <p className="font-display text-[1.08rem] font-semibold">{value}</p>
          <p className="mt-0.5 font-label text-[0.8rem] text-muted-foreground">{note}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex items-center gap-3 px-4', className)}>
      <div className="flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center">{picture}</div>
      <div className="min-w-0 leading-tight">
        <p className="font-label text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="truncate font-display text-[1rem] font-semibold">{value}</p>
        <p className="truncate font-label text-[0.8rem] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- clock

const NUMERALS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/** Turns a clock hand about the dial's centre with a CSS transform, so it can ease from one position to the next. */
function handStyle(degrees: number): React.CSSProperties {
  return { transform: `rotate(${degrees.toFixed(2)}deg)`, transformOrigin: '50px 50px' };
}

/**
 * A station clock with Roman numerals, a brass rim and brass hands. The angles
 * count up through the day (not round each minute), so the second hand's
 * springy tick never spins backwards at the top of the dial.
 */
export function Clock({ className }: { className?: string }) {
  const now = useNow();
  const date = now === null ? null : new Date(now * 1000);
  const seconds = date?.getSeconds() ?? 0;
  const minutes = (date?.getMinutes() ?? 0) + seconds / 60;
  const hours = ((date?.getHours() ?? 0) % 12) + minutes / 60;
  // Seconds since midnight: grows all day, so each tick turns the hand forwards.
  const daySeconds = date ? date.getHours() * 3600 + date.getMinutes() * 60 + seconds : 0;
  const clock = useReaderPref('clock');
  const label = date ? `The time is ${formatClock(date, clock)}` : 'Clock';

  return (
    <svg viewBox="0 0 100 100" className={cn('shrink-0', className)} role="img" aria-label={label}>
      <circle cx="50" cy="50" r="48" fill="var(--ink-gold)" />
      <circle cx="50" cy="50" r="44.5" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="0.8" />
      {Array.from({ length: 60 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1={i % 5 === 0 ? 7 : 7.5}
          x2="50"
          y2={i % 5 === 0 ? 11 : 9}
          stroke="hsl(var(--foreground))"
          strokeWidth={i % 5 === 0 ? 1.3 : 0.5}
          strokeLinecap="round"
          transform={`rotate(${i * 6} 50 50)`}
        />
      ))}
      {NUMERALS.map((numeral, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        // Rounded: Node and the browser can differ in the last digits of sin/cos, which breaks hydration.
        return (
          <text
            key={numeral}
            x={(50 + Math.sin(angle) * 31).toFixed(2)}
            y={(50 - Math.cos(angle) * 31 + 3).toFixed(2)}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            style={{ fontFamily: 'var(--font-fraunces)', fontSize: 8.4, fontWeight: 600 }}
          >
            {numeral}
          </text>
        );
      })}
      {date && (
        <g fill="var(--ink-gold)" stroke="hsl(var(--foreground))" strokeWidth="0.5" strokeLinejoin="round">
          <path className="clock-hand" d="M48.6 52 49.2 30 47 27.5 50 22 53 27.5 50.8 30 51.4 52Z" style={handStyle(hours * 30)} />
          <path className="clock-hand" d="M49.1 53 49.6 16 50 12 50.4 16 50.9 53Z" style={handStyle(minutes * 6)} />
          <g className="clock-second" style={handStyle(daySeconds * 6)} fill="var(--ink-accent)" stroke="none">
            <path d="M49.65 60 49.8 13h.4l.15 47Z" />
            <circle cx="50" cy="58" r="1.8" />
          </g>
          <circle cx="50" cy="50" r="2.6" />
        </g>
      )}
    </svg>
  );
}

/** "3:42 p.m." or "15:42" (Settings > clock) in the reader's time, or an empty line before the page has loaded. */
export function ClockText({ className }: { className?: string }) {
  const now = useNow();
  const clock = useReaderPref('clock');
  if (now === null) return <span className={className}>{' '}</span>;
  return <span className={className}>{formatClock(new Date(now * 1000), clock)}</span>;
}

/** "Thursday" in the reader's time zone. */
export function WeekdayText({ className }: { className?: string }) {
  const day = useClientValue(() => new Date().toLocaleDateString('en-GB', { weekday: 'long' }), null);
  return <span className={className}>{day ?? ' '}</span>;
}

/** The clock for the masthead: its left ear, or a row on tablets. */
export function ClockTile({ className, layout }: { className?: string; layout?: 'ear' | 'row' }) {
  return <AlmanacTile className={className} layout={layout} picture={<Clock className="h-full w-full" />} label="Local time" value={<ClockText />} note={<WeekdayText />} />;
}

// ---------------------------------------------------------------- moon

const SYNODIC_MONTH = 29.530588853;
/** A new moon: 6 January 2000, 18:14 UTC. */
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** Age of the moon in days (0 = new, about 14.8 = full). */
export function moonAge(date: Date): number {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  return ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

export function moonPhaseName(age: number): string {
  const names = [
    'New moon',
    'Waxing crescent',
    'First quarter',
    'Waxing gibbous',
    'Full moon',
    'Waning gibbous',
    'Last quarter',
    'Waning crescent',
  ];
  return names[Math.round((age / SYNODIC_MONTH) * 8) % 8];
}

/** Share of the moon's face that is lit, 0 to 1. */
export function moonIllumination(age: number): number {
  return (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2;
}

/** Where the etched stars sit round the moon (percent of the dial) and when each one twinkles. */
const STARS = [
  { left: 6, top: 14, size: 22, delay: 0 },
  { left: 73, top: 5, size: 18, delay: 1.3 },
  { left: 75, top: 68, size: 20, delay: 2.4 },
  { left: 10, top: 70, size: 16, delay: 3.1 },
];

/** Today's moon, with the lit part drawn from its age, in a patch of night sky with twinkling stars and the odd shooting star. */
export function Moon({ className }: { className?: string }) {
  const now = useNow();
  // Whole hours are enough; the shape barely changes within a day.
  const age = now === null ? null : moonAge(new Date(Math.floor(now / 3600) * 3_600_000));
  const r = 14;
  if (age !== null) {
    const angle = (2 * Math.PI * age) / SYNODIC_MONTH;
    const waxing = age < SYNODIC_MONTH / 2;
    const rx = Math.abs(Math.cos(angle)) * r;
    const crescent = Math.cos(angle) > 0;
    // Right half plus or minus half an ellipse; mirrored when waning.
    const lit = `M25 ${25 - r}A${r} ${r} 0 0 1 25 ${25 + r}A${rx.toFixed(2)} ${r} 0 0 ${crescent ? 0 : 1} 25 ${25 - r}Z`;
    return (
      <span className={cn('relative inline-block shrink-0', className)}>
        <svg viewBox="0 0 50 50" className="h-full w-full" role="img" aria-label={`Tonight: ${moonPhaseName(age).toLowerCase()}`}>
          <circle cx="25" cy="25" r="24" fill="hsl(var(--foreground) / 0.09)" stroke="hsl(var(--foreground) / 0.35)" strokeWidth="0.6" />
          <circle cx="25" cy="25" r="22.2" fill="none" stroke="hsl(var(--foreground) / 0.2)" strokeWidth="0.4" />
          <circle cx="25" cy="25" r={r} fill="hsl(var(--foreground) / 0.16)" />
          <path d={lit} fill="var(--ink-gold)" transform={waxing ? undefined : 'matrix(-1 0 0 1 50 0)'} />
          <circle cx="25" cy="25" r={r} fill="none" stroke="hsl(var(--foreground) / 0.45)" strokeWidth="0.6" />
        </svg>
        {/* Now and then (about every 25 seconds) a shooting star crosses the dial. */}
        <span className="moon-sky" aria-hidden="true">
          <span className="shooting-star" />
        </span>
        {STARS.map((star) => (
          <Ornament
            key={star.left}
            name="star"
            className="moon-star absolute"
            style={{ left: `${star.left}%`, top: `${star.top}%`, width: `${star.size}%`, animationDelay: `${star.delay}s` }}
          />
        ))}
      </span>
    );
  }
  return <span className={cn('inline-block shrink-0', className)} aria-hidden="true" />;
}

export function MoonText({ className }: { className?: string }) {
  const now = useNow();
  if (now === null) return <span className={className}>{' '}</span>;
  return <span className={className}>{moonPhaseName(moonAge(new Date(now * 1000)))}</span>;
}

/** "62% lit". Changes slowly, so whole hours are enough. */
export function MoonLitText({ className }: { className?: string }) {
  const lit = useClientValue(() => Math.round(moonIllumination(moonAge(new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000))) * 100), null);
  return <span className={className}>{lit === null ? ' ' : `${lit}% lit`}</span>;
}

/** Tonight's moon for the masthead: its right ear, or a row on tablets. */
export function MoonTile({ className, layout }: { className?: string; layout?: 'ear' | 'row' }) {
  return <AlmanacTile className={className} layout={layout} picture={<Moon className="h-full w-full" />} label="Tonight’s sky" value={<MoonText />} note={<MoonLitText />} />;
}

// ---------------------------------------------------------------- month

const MONTHS: { name: string; note: string }[] = [
  { name: 'January', note: 'Sleigh bells on the high road and a fresh year to read.' },
  { name: 'February', note: 'Short days, long letters and the first sign of spring.' },
  { name: 'March', note: 'High winds: hold on to your hat and your paper.' },
  { name: 'April', note: 'Gates mended, seeds sown, showers expected.' },
  { name: 'May', note: 'Ploughing under big skies; evenings grow long.' },
  { name: 'June', note: 'Carriages out, roses in, the longest light of the year.' },
  { name: 'July', note: 'Haymaking weather. Read in the shade.' },
  { name: 'August', note: 'Slow wagons over old bridges; the year at full height.' },
  { name: 'September', note: 'Apples in the cart and a new term begins.' },
  { name: 'October', note: 'Walks with the dog through the turning leaves.' },
  { name: 'November', note: 'The fire is lit, the cat is home. A good month for reading.' },
  { name: 'December', note: 'Wood for the hearth and stories for the long nights.' },
];

/** Short public-domain thoughts, one for each day of the month. */
const THOUGHTS: { text: string; by: string }[] = [
  { text: 'Well begun is half done.', by: 'Aristotle' },
  { text: 'Courage is resistance to fear, mastery of fear, not absence of fear.', by: 'Mark Twain' },
  { text: 'Knowledge is power.', by: 'Francis Bacon' },
  { text: 'Little by little, one travels far.', by: 'Spanish proverb' },
  { text: 'Lost time is never found again.', by: 'Benjamin Franklin' },
  { text: 'Reading is to the mind what exercise is to the body.', by: 'Richard Steele' },
  { text: 'Early to bed and early to rise makes a man healthy, wealthy and wise.', by: 'Benjamin Franklin' },
  { text: 'What do we live for, if it is not to make life less difficult to each other?', by: 'George Eliot' },
  { text: 'Brevity is the soul of wit.', by: 'William Shakespeare' },
  { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
  { text: 'Nothing is so strong as gentleness.', by: 'Francis de Sales' },
  { text: 'Kind hearts are more than coronets.', by: 'Alfred Tennyson' },
  { text: 'The best way out is always through.', by: 'Robert Frost' },
  { text: 'The unexamined life is not worth living.', by: 'Socrates' },
  { text: 'Books are the quietest and most constant of friends.', by: 'Charles W. Eliot' },
  { text: 'Hope is a good breakfast.', by: 'Francis Bacon' },
  { text: 'He that can have patience can have what he will.', by: 'Benjamin Franklin' },
  { text: 'I am large, I contain multitudes.', by: 'Walt Whitman' },
  { text: 'To be, or not to be: that is the question.', by: 'William Shakespeare' },
  { text: 'Every day is a fresh beginning.', by: 'Susan Coolidge' },
  { text: 'Fortune favours the bold.', by: 'Virgil' },
  { text: 'Where there is a will, there is a way.', by: 'Proverb' },
  { text: 'The beginning is the most important part of the work.', by: 'Plato' },
  { text: 'One today is worth two tomorrows.', by: 'Benjamin Franklin' },
  { text: 'A journey of a thousand miles begins with a single step.', by: 'Laozi' },
  { text: 'All things are difficult before they are easy.', by: 'Thomas Fuller' },
  { text: 'Light tomorrow with today.', by: 'Elizabeth Barrett Browning' },
  { text: 'Some books are to be tasted, others to be swallowed, and some few to be chewed and digested.', by: 'Francis Bacon' },
  { text: 'Act well your part; there all the honour lies.', by: 'Alexander Pope' },
  { text: 'What we learn with pleasure we never forget.', by: 'Alfred Mercier' },
  { text: 'Tomorrow is a new day with no mistakes in it yet.', by: 'L. M. Montgomery' },
];

/** The reader's month (0-11) and day of the month (1-31). */
function useMonthAndDay(): { month: number; day: number } {
  const now = new Date();
  // Packed into one number so the client value is a primitive.
  const packed = useClientValue(() => {
    const d = new Date();
    return d.getMonth() * 100 + d.getDate();
  }, now.getMonth() * 100 + now.getDate());
  return { month: Math.floor(packed / 100), day: packed % 100 };
}

/**
 * The almanac card: this month's woodcut by Edward Penfield, a line about the
 * month and a thought for the day.
 */
export function MonthAlmanac({ className, wide = false }: { className?: string; wide?: boolean }) {
  const { month, day } = useMonthAndDay();
  const { name, note } = MONTHS[month];
  const thought = THOUGHTS[(day - 1) % THOUGHTS.length];
  return (
    <section
      aria-label="The almanac"
      className={cn('card-paper overflow-hidden', wide && 'grid items-center md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]', className)}
    >
      <div className={wide ? 'p-5 sm:p-7' : 'px-5 pt-5'}>
        <Engraving name={`month-${name.toLowerCase()}` as EngravingName} className="w-full" soft label={`A woodcut for ${name}`} />
      </div>
      <div className={wide ? 'px-6 pb-8 text-center md:py-8 md:pl-2 md:pr-10' : 'px-5 pb-6 pt-3 text-center'}>
        <p className="label text-muted-foreground">The almanac</p>
        <h2 className={cn('mt-1 font-display font-semibold italic', wide ? 'text-[2rem]' : 'text-2xl')}>{name}</h2>
        <p className="mt-1 text-[0.95rem] italic text-muted-foreground">{note}</p>
        <div className="ornament mx-auto my-4 w-3/4" />
        <p className="label text-muted-foreground">Thought for the day</p>
        <blockquote className={cn('mt-1.5 font-display leading-snug', wide ? 'text-[1.3rem]' : 'text-[1.1rem]')}>“{thought.text}”</blockquote>
        <p className="mt-1 font-label text-[0.82rem] text-muted-foreground">{thought.by}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- on this day

/**
 * "From the almanac: on this day": three anniversaries for today's date from
 * Wikipedia (lib/on-this-day.ts), each under its year in large type, like the
 * dated paragraphs of an old almanac. Sits under "In other news".
 */
export function OnThisDayCard({ data, className }: { data: OnThisDay; className?: string }) {
  return (
    <section aria-labelledby="on-this-day" className={cn('card-paper px-5 pb-4 pt-5', className)}>
      <p className="kicker text-center">From the almanac</p>
      <h2 id="on-this-day" className="mt-1 text-center font-display text-[1.35rem] font-semibold italic leading-tight">
        On this day, {data.dateLabel}
      </h2>
      <div className="ornament mx-auto my-3 w-2/3" />
      <ol className="divide-y divide-dashed divide-rule/40">
        {data.events.map((event) => (
          <li key={`${event.year}-${event.text.slice(0, 20)}`} className="grid grid-cols-[3.6rem_minmax(0,1fr)] gap-3 py-2.5">
            <span className="pt-0.5 text-right font-display text-[1.25rem] font-semibold leading-none text-(--brass-ink) tabular-nums">{event.year}</span>
            <p className="text-[0.93rem] leading-snug">
              {event.url ? (
                <a href={event.url} target="_blank" rel="noopener noreferrer" className="decoration-1 underline-offset-2 hover:underline">
                  {event.text}
                </a>
              ) : (
                event.text
              )}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-2 border-t border-rule/30 pt-2 text-center font-label text-[0.72rem] text-muted-foreground">
        From{' '}
        <a href="https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Wikipedia’s anniversaries
        </a>{' '}
        (CC BY-SA)
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- language

/** "English edition" in small capitals beside an engraved globe. Only English for now; more languages may follow. */
export function EditionLanguage({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title="This paper is printed in English">
      <Ornament name="globe" className="h-[1.05rem] [--ornament-ink:currentColor]" />
      <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em]">English edition</span>
    </span>
  );
}
