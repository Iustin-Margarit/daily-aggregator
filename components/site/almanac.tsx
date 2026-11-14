'use client';

import { useId, useSyncExternalStore } from 'react';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import type { OnThisDay } from '@/lib/on-this-day';
import { formatClock } from '@/lib/reader-prefs';
import { useClientValue } from '@/lib/use-client-value';
import { useReaderPref } from '@/lib/use-reader-pref';
import { cn } from '@/lib/utils';

/*
 * Small printed details with some soul: a live clock, tonight's moon and the
 * month's woodcut with a thought for the day, in the reader's edition. The
 * time, moon and month use the reader's own clock, so they only appear after
 * the page loads. (The edition's language: components/site/edition-selector.tsx.)
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
      <div className={cn('flex flex-col items-center justify-center gap-2 px-3 py-3 text-center', className)}>
        <p className="section-head w-full whitespace-nowrap font-label text-[0.68rem] tracking-[0.18em] text-muted-foreground">{label}</p>
        {/* Both instruments stand on the same line in the same box, so the lines under them stay level across the masthead. */}
        <div className="flex h-[10rem] items-end justify-center">{picture}</div>
        <div className="leading-tight">
          <p className="font-display text-[1.08rem] font-semibold">{value}</p>
          <p className="mt-0.5 font-label text-[0.8rem] text-muted-foreground">{note}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex items-center gap-3 px-4', className)}>
      <div className="flex h-[5.6rem] shrink-0 items-center justify-center">{picture}</div>
      <div className="min-w-0 leading-tight">
        <p className="font-label text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="truncate font-display text-[1rem] font-semibold">{value}</p>
        <p className="truncate font-label text-[0.8rem] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- clock

/** The enamel dial's hours; the small seconds dial sits where VI would be, as on most watches of the day. */
const NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', '', 'VII', 'VIII', 'IX', 'X', 'XI'];
/** The small seconds dial, in place of VI. */
const SUB = { cy: 70, r: 9 };

/** Turns a hand about a point of the dial with a CSS transform, so it can ease from one position to the next. */
function handStyle(degrees: number, originY = 50): React.CSSProperties {
  return { transform: `rotate(${degrees.toFixed(2)}deg)`, transformOrigin: `50px ${originY}px` };
}

/*
 * The watch case is a pocket watch from the United Watch & Jewelry Company's
 * 1911 catalogue (public/ornaments/watch-case.webp, docs/ASSETS.md): bow,
 * crown and engraved bezel, with the dial cut away. These are its pixels.
 */
const CASE = { width: 911, height: 1312, cx: 454.5, cy: 857, dial: 344 };
/** The engraved bezel alone (watch-bezel.webp), which frames the moon: its outer and inner radius, out of 50. */
const BEZEL = { outer: 49.8, inner: 37.9 };

/** A unique id for an SVG pattern or mask (the clock and moon are on the page twice: the ear and the tablet row). */
function useSvgId(name: string) {
  return `${useId().replace(/[^\w-]/g, '')}-${name}`;
}

/** An ink mask (black on transparent) for use inside an SVG: paint anything through it. */
function InkMask({ id, href, x = 0, y = 0, width, height }: { id: string; href: string; x?: number; y?: number; width: number; height: number }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} style={{ maskType: 'alpha' }}>
      <image href={href} x={x} y={y} width={width} height={height} preserveAspectRatio="none" />
    </mask>
  );
}

/** Polished brass, lit from the upper left: the cases of both instruments. */
function BrassGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="var(--brass-hi)" />
      <stop offset="0.55" stopColor="var(--brass-mid)" />
      <stop offset="1" stopColor="var(--brass-lo)" />
    </linearGradient>
  );
}

/**
 * A Breguet hand pointing to twelve: a fine shaft, the open "moon" ring near
 * the end, and a slender point. `ring` is the ring's distance from the centre.
 */
function BreguetHand({ ring, size, tip, width }: { ring: number; size: number; tip: number; width: number }) {
  const ringY = 50 - ring;
  const w = width / 2;
  return (
    <>
      <path d={`M${50 - w} 53 L${50 - w / 2.4} ${ringY + size} L${50 + w / 2.4} ${ringY + size} L${50 + w} 53Z`} />
      <circle cx="50" cy={ringY} r={size} fill="none" stroke="var(--dial-hand)" strokeWidth={size * 0.42} />
      <path d={`M${50 - w * 1.1} ${ringY - size + 0.3} Q${50 - w / 3} ${ringY - size - (tip - size) * 0.45} 50 ${50 - tip} Q${50 + w / 3} ${ringY - size - (tip - size) * 0.45} ${50 + w * 1.1} ${ringY - size + 0.3}Z`} />
    </>
  );
}

/**
 * A Victorian pocket watch: the real engraved case of a 1911 catalogue watch
 * in brass, round a cream enamel dial (deep blue enamel in the night edition)
 * with Roman hours, a minute track, blued-steel Breguet hands and a small
 * seconds dial. The angles count up through the day (not round each minute),
 * so a hand's springy tick never spins it backwards at the top of the dial.
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
  const { t, fmt, locale } = useI18n();
  const label = date ? fmt(t.almanac.timeIs, { time: formatClock(date, clock, locale) }) : t.almanac.clock;
  const caseMask = useSvgId('case');
  const brass = useSvgId('brass');
  const enamel = useSvgId('enamel');
  const glass = useSvgId('glass');
  const { width, height, cx, cy, dial } = CASE;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('aspect-[911/1312] shrink-0', className)} role="img" aria-label={label}>
      <defs>
        <InkMask id={caseMask} href="/ornaments/watch-case.webp" width={width} height={height} />
        <BrassGradient id={brass} />
        <radialGradient id={enamel} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0.6" stopColor="var(--dial-face)" />
          <stop offset="1" stopColor="var(--dial-face-edge)" />
        </radialGradient>
        {/* The light on the watch glass, top left. */}
        <radialGradient id={glass} cx="0.3" cy="0.22" r="0.5">
          <stop offset="0" style={{ stopColor: '#fff', stopOpacity: 'var(--dial-glint)' }} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={dial + 4} fill={`url(#${enamel})`} />
      <svg x={cx - dial} y={cy - dial} width={dial * 2} height={dial * 2} viewBox="0 0 100 100" overflow="visible">
        {/* The minute track between two fine rules, with a heavier mark every five minutes. */}
        <g stroke="var(--dial-ink)" fill="none">
          <circle cx="50" cy="50" r="46.6" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="42.4" strokeWidth="0.35" />
          {Array.from({ length: 60 }, (_, i) => (
            <line
              key={i}
              x1="50"
              y1={i % 5 === 0 ? 3.4 : 3.6}
              x2="50"
              y2={i % 5 === 0 ? 7.6 : 7.2}
              strokeWidth={i % 5 === 0 ? 1.1 : 0.4}
              transform={`rotate(${i * 6} 50 50)`}
            />
          ))}
        </g>
        {NUMERALS.map((numeral, i) => {
          if (!numeral) return null;
          const angle = (i * 30 * Math.PI) / 180;
          // Rounded: Node and the browser can differ in the last digits of sin/cos, which breaks hydration.
          return (
            <text
              key={numeral}
              x={(50 + Math.sin(angle) * 32.8).toFixed(2)}
              y={(50 - Math.cos(angle) * 32.8 + 3.4).toFixed(2)}
              textAnchor="middle"
              fill="var(--dial-ink)"
              style={{ fontFamily: 'var(--font-fraunces)', fontSize: 10, fontWeight: 600, letterSpacing: -0.3 }}
            >
              {numeral}
            </text>
          );
        })}
        {/* The small seconds dial. */}
        <g stroke="var(--dial-ink)" fill="none">
          <circle cx="50" cy={SUB.cy} r={SUB.r} strokeWidth="0.35" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="50" y1={SUB.cy - SUB.r} x2="50" y2={SUB.cy - SUB.r + (i % 3 === 0 ? 2 : 1.3)} strokeWidth={i % 3 === 0 ? 0.6 : 0.35} transform={`rotate(${i * 30} 50 ${SUB.cy})`} />
          ))}
        </g>
        {date && (
          <g fill="var(--dial-hand)">
            <g className="clock-second" style={handStyle(daySeconds * 6, SUB.cy)}>
              <path d={`M49.78 ${SUB.cy + 1.9} 49.86 ${SUB.cy - SUB.r + 0.8}h.28l.08 ${SUB.r + 1.1}Z`} />
              <circle cx="50" cy={SUB.cy} r="0.95" />
            </g>
            <g className="clock-hand" style={handStyle(hours * 30)}>
              <BreguetHand ring={20.5} size={3.1} tip={28.5} width={2.2} />
            </g>
            <g className="clock-hand" style={handStyle(minutes * 6)}>
              <BreguetHand ring={33.5} size={2.45} tip={44} width={1.7} />
            </g>
            <circle cx="50" cy="50" r="2.5" />
            <circle cx="50" cy="50" r="0.85" fill="var(--brass-hi)" />
          </g>
        )}
        <circle cx="50" cy="50" r="50" fill={`url(#${glass})`} />
      </svg>
      {/* The engraved case, printed in brass, with a brass hairline round it. */}
      <rect width={width} height={height} fill={`url(#${brass})`} mask={`url(#${caseMask})`} />
      <circle cx={cx} cy={cy} r="458" fill="none" stroke="var(--brass-mid)" strokeOpacity="0.55" strokeWidth="3" />
    </svg>
  );
}

/** "3:42 p.m." or "15:42" (Settings > clock) in the reader's time, or an empty line before the page has loaded. */
export function ClockText({ className }: { className?: string }) {
  const now = useNow();
  const clock = useReaderPref('clock');
  const { locale } = useI18n();
  if (now === null) return <span className={className}>{' '}</span>;
  return <span className={className}>{formatClock(new Date(now * 1000), clock, locale)}</span>;
}

/** "Thursday" ("Jeudi", "Jueves", ...) in the reader's time zone. */
export function WeekdayText({ className }: { className?: string }) {
  const { dates } = useI18n();
  const day = useClientValue(() => dates.weekday(new Date()), null);
  return <span className={className}>{day ?? ' '}</span>;
}

/** The clock for the masthead: its left ear, or a row on tablets. */
export function ClockTile({ className, layout }: { className?: string; layout?: 'ear' | 'row' }) {
  const { t } = useI18n();
  return <AlmanacTile className={className} layout={layout} picture={<Clock className="h-full w-auto" />} label={t.almanac.localTime} value={<ClockText />} note={<WeekdayText />} />;
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

/** The phase's name from the edition's eight (almanac.phases: new moon, waxing crescent, ... waning crescent). */
export function moonPhaseName(age: number, names: string[]): string {
  return names[Math.round((age / SYNODIC_MONTH) * 8) % 8];
}

/** Share of the moon's face that is lit, 0 to 1. */
export function moonIllumination(age: number): number {
  return (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2;
}

/** Where the engraved stars sit on the almanac dial, between the degree ring and the moon (percent of the dial), and when each one twinkles. */
const STARS = [
  { left: 29.4, top: 29.8, size: 6.2, delay: 0 },
  { left: 71, top: 30.6, size: 4.8, delay: 1.3 },
  { left: 70.2, top: 70.8, size: 5.6, delay: 2.4 },
  { left: 30.2, top: 69.6, size: 4.4, delay: 3.1 },
];

/** The moon's radius on the almanac dial (out of 50). */
const MOON_R = 25.5;

/**
 * Tonight's moon as an almanac dial: Claude Mellan's engraved full moon (1635)
 * in the same engraved brass bezel as the watch, ringed by a fine degree scale
 * and twinkling engraved stars, with the dark part of the moon laid over it in
 * hatched ink from the moon's age. Now and then a shooting star streaks past.
 */
export function Moon({ className }: { className?: string }) {
  const now = useNow();
  const engraving = useSvgId('moon');
  const bezel = useSvgId('bezel');
  const brass = useSvgId('brass');
  const hatch = useSvgId('hatch');
  const sky = useSvgId('sky');
  const trail = useSvgId('trail');
  const { t, fmt, tag } = useI18n();
  // Whole hours are enough; the shape barely changes within a day.
  const age = now === null ? null : moonAge(new Date(Math.floor(now / 3600) * 3_600_000));
  const r = MOON_R;
  const c = 50;
  let shade: React.ReactNode = null;
  if (age !== null) {
    const angle = (2 * Math.PI * age) / SYNODIC_MONTH;
    const waxing = age < SYNODIC_MONTH / 2;
    const rx = Math.abs(Math.cos(angle)) * r;
    const crescent = Math.cos(angle) > 0;
    // The dark part: the left half, plus or minus half an ellipse (the terminator); mirrored when waning.
    const d = `M${c} ${c - r}A${r} ${r} 0 0 0 ${c} ${c + r}A${rx.toFixed(2)} ${r} 0 0 ${crescent ? 0 : 1} ${c} ${c - r}Z`;
    shade = (
      <g transform={waxing ? undefined : `matrix(-1 0 0 1 ${2 * c} 0)`}>
        <path d={d} fill="var(--moon-shade)" fillOpacity="var(--moon-shade-alpha)" />
        <path d={d} fill={`url(#${hatch})`} />
      </g>
    );
  }
  return (
    <span className={cn('relative inline-block aspect-square shrink-0', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={age === null ? t.almanac.moon : fmt(t.almanac.moonTonight, { phase: moonPhaseName(age, t.almanac.phases).toLocaleLowerCase(tag) })}>
        <defs>
          <InkMask id={engraving} href="/ornaments/moon-engraving.webp" x={c - r} y={c - r} width={2 * r} height={2 * r} />
          <InkMask id={bezel} href="/ornaments/watch-bezel.webp" width={100} height={100} />
          <BrassGradient id={brass} />
          <clipPath id={sky}>
            <circle cx={c} cy={c} r={BEZEL.inner} />
          </clipPath>
          {/* The shooting star: a bright head with a fading tail behind it. */}
          <linearGradient id={trail} gradientUnits="userSpaceOnUse" x1="-24" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="var(--meteor)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--meteor)" />
          </linearGradient>
          {/* Engraver's hatching for the moon's dark side. */}
          <pattern id={hatch} width="1.35" height="1.35" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
            <line x1="0" y1="0.3" x2="1.35" y2="0.3" stroke="var(--moon-shade)" strokeWidth="0.5" />
          </pattern>
        </defs>
        {/* The sky of the dial, and its degree ring: a mark every 5 degrees, longer every 30. */}
        <circle cx={c} cy={c} r={BEZEL.inner + 0.6} fill="var(--almanac-sky)" />
        <g stroke="var(--almanac-line)" fill="none">
          <circle cx={c} cy={c} r="36.4" strokeWidth="0.35" />
          <circle cx={c} cy={c} r="32.6" strokeWidth="0.3" />
          {Array.from({ length: 72 }, (_, i) => (
            <line
              key={i}
              x1={c}
              y1={c - 32.6}
              x2={c}
              y2={i % 6 === 0 ? c - 36.4 : i % 2 === 0 ? c - 34.9 : c - 34}
              strokeWidth={i % 6 === 0 ? 0.6 : 0.3}
              transform={`rotate(${i * 5} ${c} ${c})`}
            />
          ))}
        </g>
        {/* Now and then (about every 22 seconds) a shooting star streaks across the sky above the moon. */}
        {age !== null && (
          <g clipPath={`url(#${sky})`} aria-hidden="true">
            <g transform="translate(9 13) rotate(10)">
              <g className="shooting-star">
                <line x1="-24" y1="0" x2="0" y2="0" stroke={`url(#${trail})`} strokeWidth="1.25" strokeLinecap="round" />
                <circle r="1" fill="var(--meteor)" />
              </g>
            </g>
          </g>
        )}
        {/* The moon: its lit face, Mellan's engraving printed on it, and tonight's shadow. */}
        <circle cx={c} cy={c} r={r} fill="var(--moon-lit)" />
        <rect x={c - r} y={c - r} width={2 * r} height={2 * r} fill="var(--moon-ink)" mask={`url(#${engraving})`} />
        {shade}
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--almanac-line)" strokeWidth="0.4" />
        {/* The engraved brass bezel, the same as the watch's, with a brass hairline round it. */}
        <rect width="100" height="100" fill={`url(#${brass})`} mask={`url(#${bezel})`} />
        <circle cx={c} cy={c} r={BEZEL.outer + 0.35} fill="none" stroke="var(--brass-mid)" strokeOpacity="0.55" strokeWidth="0.33" />
      </svg>
      {age !== null && (
        <>
          {STARS.map((star) => (
            <Ornament
              key={star.left}
              name="star"
              className="moon-star absolute [--ornament-ink:var(--almanac-star)]"
              style={{ left: `${star.left - star.size / 2}%`, top: `${star.top - star.size / 2}%`, width: `${star.size}%`, animationDelay: `${star.delay}s` }}
            />
          ))}
        </>
      )}
    </span>
  );
}

export function MoonText({ className }: { className?: string }) {
  const now = useNow();
  const { t } = useI18n();
  if (now === null) return <span className={className}>{' '}</span>;
  return <span className={className}>{moonPhaseName(moonAge(new Date(now * 1000)), t.almanac.phases)}</span>;
}

/** "62% lit". Changes slowly, so whole hours are enough. */
export function MoonLitText({ className }: { className?: string }) {
  const { t, fmt } = useI18n();
  const lit = useClientValue(() => Math.round(moonIllumination(moonAge(new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000))) * 100), null);
  return <span className={className}>{lit === null ? ' ' : fmt(t.almanac.lit, { n: lit })}</span>;
}

/**
 * The moon for the masthead: its right ear, or a row on tablets. "Lunar
 * almanac" reads right in both editions (morning and night alike).
 */
export function MoonTile({ className, layout }: { className?: string; layout?: 'ear' | 'row' }) {
  const { t } = useI18n();
  return <AlmanacTile className={className} layout={layout} picture={<Moon className={layout === 'ear' ? 'h-[78%] w-auto' : 'h-full w-auto'} />} label={t.almanac.lunar} value={<MoonText />} note={<MoonLitText />} />;
}

// ---------------------------------------------------------------- month

/** The Penfield woodcut for each month (public/engravings/month-*.webp); the words are in the dictionaries (almanac.months). */
const MONTH_WOODCUTS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;

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
  const { t, fmt } = useI18n();
  const { name, note } = t.almanac.months[month];
  const thought = t.almanac.thoughts[(day - 1) % t.almanac.thoughts.length];
  return (
    <section
      aria-label={t.almanac.title}
      className={cn('card-paper overflow-hidden', wide && 'grid items-center md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]', className)}
    >
      <div className={wide ? 'p-5 sm:p-7' : 'px-5 pt-5'}>
        <Engraving name={`month-${MONTH_WOODCUTS[month]}` as EngravingName} className="w-full" soft label={fmt(t.almanac.woodcutFor, { month: name })} />
      </div>
      <div className={wide ? 'px-6 pb-8 text-center md:py-8 md:pl-2 md:pr-10' : 'px-5 pb-6 pt-3 text-center'}>
        <p className="label text-muted-foreground">{t.almanac.title}</p>
        <h2 className={cn('mt-1 font-display font-semibold italic', wide ? 'text-[2rem]' : 'text-2xl')}>{name}</h2>
        <p className="mt-1 text-[0.95rem] italic text-muted-foreground">{note}</p>
        <div className="ornament mx-auto my-4 w-3/4" />
        <p className="label text-muted-foreground">{t.almanac.thought}</p>
        <blockquote className={cn('mt-1.5 font-display leading-snug', wide ? 'text-[1.3rem]' : 'text-[1.1rem]')}>{fmt(t.almanac.quoted, { text: thought.text })}</blockquote>
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
  const { t, fmt, rich } = useI18n();
  return (
    <section aria-labelledby="on-this-day" className={cn('card-paper px-5 pb-4 pt-5', className)}>
      <p className="kicker text-center">{t.almanac.fromAlmanac}</p>
      <h2 id="on-this-day" className="mt-1 text-center font-display text-[1.35rem] font-semibold italic leading-tight text-balance">
        {fmt(t.almanac.onThisDay, { date: data.dateLabel })}
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
        {rich(t.almanac.wikipediaCredit, {
          link: (
            <a href={data.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {t.almanac.wikipediaLink}
            </a>
          ),
        })}
      </p>
    </section>
  );
}
