'use client';

import '@/styles/street-theatre.css';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Ornament } from '@/components/site/ornament';
import { isAmbiencePlaying, setAmbience, setAmbienceStage, setAmbienceStageInView, subscribeAmbience } from '@/lib/ambience';
import { useI18n } from '@/lib/i18n/client';
import { setReaderPref, useReaderPref } from '@/lib/use-reader-pref';
import { cn } from '@/lib/utils';

/*
 * The street under the masthead, built like a Victorian paper theatre from
 * public-domain prints (credits in docs/ASSETS.md):
 *   far:   Wenceslaus Hollar's etched skyline of London, in haze, with chimney
 *          smoke rising from behind its roofs;
 *   mid:   J. W. Fiske iron railings (1875) and gas lamps whose flames gutter
 *          and whose halos breathe;
 *   road:  now and then a hansom cab trots past, its near wheel turning;
 *   front: cut-paper silhouettes by Auguste Edouart (1830s-40s), on cobbles,
 *          and a newsboy on a crate (pieced from Edouart cut-outs) holding up
 *          the paper.
 * The layers drift at different speeds, as if the reader strolls past; the
 * townsfolk walk with jointed paper legs, framed from the knees up. Moths
 * circle the lamps, and now and then a carrier pigeon crosses the far sky.
 * Every size is a share of the banner height (--st-h), so speeds and strides
 * stay in step at any size. GPU transforms and opacity only; it pauses off
 * screen, and has a Pause button (the "banner" reading preference) that also
 * stills the masthead's sky. It moves by default, even where the device asks for
 * less motion (styles/street-theatre.css); the sound only ever starts from a press.
 */

// ---------------------------------------------------------------- pause state

/*
 * Paused or not is the reader's "banner" preference (Moving / Still / Hidden,
 * also in Settings), kept in a cookie so the server prints the page still at
 * once; the styles read it from <html data-banner>. Readers who paused with an
 * older version (localStorage) keep their choice.
 */
const OLD_STORAGE_KEY = 'city-strip-paused';

// ---------------------------------------------------------------- the cast

/** Width / height of each cut-out (public/street/fig-*.webp, all 300 px tall). */
const ASPECT = {
  'gent-hat': 119 / 300,
  'gent-cane': 123 / 300,
  'gent-pointing': 106 / 300,
  'lady-book': 129 / 300,
  'lady-reading': 125 / 300,
  'ladies-talking': 241 / 300,
  'girl-flower': 100 / 300,
  'girl-doll': 184 / 300,
  'boy-running': 185 / 300,
  // Boy and crate; the paper in his raised hand is fig-newsboy-paper.webp on the same canvas.
  newsboy: 131 / 300,
} as const;
type FigureName = keyof typeof ASPECT;

/** A leg cut from the figure: columns [left, right] below `top`, swinging about the hip. Shares of the figure. */
type Leg = { left: number; right: number; top: number; hipX: number; hipY: number };

type Walker = {
  name: FigureName;
  /** Height as a share of the banner. */
  size: number;
  /** Walks from right to left (the cut-out is mirrored). */
  left?: boolean;
  /** Screen speed in banner heights per second. */
  speed: number;
  /** Seconds per full stride (two steps); legs and bob follow it. */
  cycle: number;
  /** Where along its route the walker is when the page opens, 0 to 1. */
  offset: number;
  /** How the figure moves: jointed legs, a lady's glide, or a child's hop. */
  gait: 'legs' | 'glide' | 'hop';
  /** For gait "legs": two leg pieces, or one piece used twice when the legs overlap in profile. */
  legs?: Leg[];
  /** Body above this share of the height (gait "legs"). */
  waist?: number;
  swing?: number;
};

/*
 * The street moves left at 0.0467 heights/s. Walking right at 0.0935 on screen
 * is 0.14 against the ground, about 0.8 steps a second for an adult: a calm
 * stroll. Walking left at 0.15 on screen is 0.103 against the ground.
 */
const WALKERS: Walker[] = [
  {
    name: 'gent-hat',
    size: 0.5,
    speed: 0.0935,
    cycle: 2.4,
    offset: 0.12,
    gait: 'legs',
    waist: 0.72,
    swing: 9,
    legs: [
      { left: 0.13, right: 0.4, top: 0.7, hipX: 0.27, hipY: 0.55 },
      { left: 0.42, right: 0.8, top: 0.7, hipX: 0.56, hipY: 0.55 },
    ],
  },
  { name: 'lady-book', size: 0.48, speed: 0.09, cycle: 2.6, offset: 0.5, gait: 'glide' },
  // Her daughter keeps pace a step behind.
  { name: 'girl-doll', size: 0.31, speed: 0.09, cycle: 1.6, offset: 0.46, gait: 'hop' },
  { name: 'boy-running', size: 0.33, speed: 0.17, cycle: 0.9, offset: 0.78, gait: 'hop' },
  {
    name: 'gent-cane',
    size: 0.48,
    left: true,
    speed: 0.15,
    cycle: 3.2,
    offset: 0.3,
    gait: 'legs',
    waist: 0.61,
    swing: 8,
    legs: [{ left: 0, right: 0.5, top: 0.59, hipX: 0.24, hipY: 0.5 }],
  },
  { name: 'girl-flower', size: 0.46, left: true, speed: 0.15, cycle: 3, offset: 0.8, gait: 'glide' },
];

/** People standing further back in the street (they drift with it). x in banner heights within one 9.3-height stretch. */
const STANDING: { name: FigureName; size: number; x: number; flip?: boolean; idle: string }[] = [
  { name: 'ladies-talking', size: 0.41, x: 1.3, idle: 'st-chat' },
  { name: 'lady-reading', size: 0.4, x: 4.6, idle: 'st-breathe' },
  { name: 'gent-pointing', size: 0.42, x: 7.2, idle: 'st-breathe' },
];

/** Street layer repeats every 9.3 banner heights (four cobble tiles); copies cover wide screens. */
const STREET_PERIOD = 9.3;
/** Lamps stand every 1.698 heights (four railing panels). */
const LAMP_STEP = 1.698;

/**
 * The newsboy on his crate at the kerb, holding up the late edition. He stands
 * on the pavement with the townsfolk (so he drifts with the street, in front of
 * the railings), between the two ladies talking and the lady reading, where he
 * is in view as soon as the page opens, even on a phone. Height (paper to
 * crate) as a share of the banner, x in banner heights within one stretch.
 */
const NEWSBOY = { size: 0.44, x: 2.75 };

/**
 * Chimney smoke over Hollar's roofs: where each plume rises in a skyline tile
 * (share of the tile's width, and of its height from the bottom), clear of the
 * church towers. Mirrored tiles mirror the places too.
 */
const CHIMNEYS = [
  { x: 0.145, y: 0.46, delay: 0 },
  { x: 0.245, y: 0.5, delay: -4.2 },
  { x: 0.395, y: 0.47, delay: -7.5 },
  { x: 0.475, y: 0.5, delay: -2.1 },
  { x: 0.725, y: 0.48, delay: -5.6 },
  { x: 0.865, y: 0.46, delay: -9.1 },
];

/** Moths round a lamp: seconds per circuit, a head start, and orbit size as a share of the halo. Odd lamps get one, even lamps two. */
const MOTHS = [
  { lap: 5.2, delay: 0, reach: 0.34 },
  { lap: 7.4, delay: -3.1, reach: 0.22 },
];

type Vars = Record<string, string | number>;

// ---------------------------------------------------------------- pieces

function CutOut({ name, size, className, style, children }: { name: FigureName; size: number; className?: string; style?: Vars; children?: React.ReactNode }) {
  return (
    <div
      className={cn('st-fig', className)}
      style={{ '--fh': size, '--fw': (size * ASPECT[name]).toFixed(4), '--src': `url(/street/fig-${name}.webp)`, ...style } as React.CSSProperties}
    >
      {children ?? <span className="st-piece" />}
    </div>
  );
}

function WalkerFigure({ walker }: { walker: Walker }) {
  const { name, size, gait } = walker;
  if (gait !== 'legs' || !walker.legs) {
    return <CutOut name={name} size={size} className={gait === 'glide' ? 'st-glide' : 'st-hop'} />;
  }
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const [first, second] = walker.legs;
  const leg = (l: Leg, phase: 'a' | 'b') => (
    <span
      key={phase}
      className={cn('st-piece st-leg', phase === 'b' && 'st-leg-b')}
      style={
        {
          clipPath: `inset(${pct(l.top)} ${pct(1 - l.right)} 0 ${pct(l.left)})`,
          transformOrigin: `${pct(l.hipX)} ${pct(l.hipY)}`,
        } as React.CSSProperties
      }
    />
  );
  return (
    <CutOut name={name} size={size} className="st-walk" style={{ '--swing': walker.swing ?? 9 }}>
      {/* Legs behind the body, then the body down to the coat's hem. */}
      {leg(first, 'a')}
      {leg(second ?? first, 'b')}
      <span className="st-piece st-body" style={{ clipPath: `inset(0 0 ${pct(1 - (walker.waist ?? 0.7))} 0)` } as React.CSSProperties} />
    </CutOut>
  );
}

function Lane({ walker }: { walker: Walker }) {
  const fw = walker.size * ASPECT[walker.name];
  return (
    <div
      className={cn('st-lane', walker.left && 'st-left')}
      style={{ '--fw': fw.toFixed(4), '--fh': walker.size, '--speed': walker.speed, '--offset': walker.offset, '--cycle': `${walker.cycle}s` } as React.CSSProperties}
    >
      <div className="st-flip">
        <WalkerFigure walker={walker} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sound

/**
 * The "Sound" ticket beside Pause: a calm 1890s promenade, with footsteps,
 * passing chatter, birds by day, and the carriage heard as the cab crosses
 * (real recordings, lib/ambience.ts). Off whenever a page loads; Pause holds
 * it on every page (sound-ticket.tsx follows the setting). It keeps playing on
 * the other pages, where the corner ticket turns it off.
 */
function SoundToggle() {
  const playing = useSyncExternalStore(subscribeAmbience, isAmbiencePlaying, () => false);
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="st-toggle st-sound"
      onClick={() => setAmbience(!playing)}
      aria-pressed={playing}
      title={playing ? t.street.soundTitlePlaying : t.street.soundTitle}
    >
      <Ornament name="gramophone" className="h-[1.05rem] [--ornament-ink:currentColor]" />
      {/* The state in words ("Sound: off" / "Sound: on"); on phones only the gramophone, dimmed when off, lit when on. */}
      <span className="st-label">{playing ? t.street.soundOn : t.street.soundOff}</span>
      <span className="sr-only">{t.street.soundSr}</span>
    </button>
  );
}

// ---------------------------------------------------------------- the banner

export function StreetTheatre({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const paused = useReaderPref('banner') === 'still';

  // A pause from before the setting existed (localStorage) becomes the setting.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(OLD_STORAGE_KEY) === '1') {
        window.localStorage.removeItem(OLD_STORAGE_KEY);
        setReaderPref('banner', 'still');
      }
    } catch {
      // Blocked storage: nothing to carry over.
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Routes are as long as the banner is wide (in banner heights), at least 6.
    const resize = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      // The scene's drawing height (--st-h); the banner shows only its lower part (street-theatre.css).
      const height = parseFloat(getComputedStyle(element).getPropertyValue('--st-h')) || entry.contentRect.height;
      if (height > 0) element.style.setProperty('--span', Math.max(width / height, 6).toFixed(3));
    });
    // No animation work while the banner is scrolled out of view.
    const visibility = new IntersectionObserver(([entry]) => {
      element.classList.toggle('st-offscreen', !entry.isIntersecting);
      setAmbienceStageInView(entry.isIntersecting);
    });
    resize.observe(element);
    visibility.observe(element);
    // The sound follows the cab and the pigeon.
    setAmbienceStage(element);
    return () => {
      resize.disconnect();
      visibility.disconnect();
      setAmbienceStage(null);
    };
  }, []);

  return (
    <div ref={ref} className={cn('st', className)}>
      <div className="st-scene" aria-hidden="true">
        {/* Chimney smoke, behind the skyline so it rises from behind the roofs; it drifts with the skyline. */}
        <div className="st-pan st-far-pan st-smoke-pan">
          {[0, 1, 2].flatMap((tile) =>
            CHIMNEYS.map((chimney, c) => (
              <span
                key={`${tile}-${c}`}
                className="st-plume"
                style={
                  {
                    '--x': (tile + (tile % 2 === 1 ? 1 - chimney.x : chimney.x)).toFixed(3),
                    '--y': chimney.y,
                    '--smoke-delay': `${chimney.delay - tile * 1.3}s`,
                  } as React.CSSProperties
                }
              >
                <i />
                <i />
              </span>
            )),
          )}
        </div>

        {/* Far: Hollar's skyline, mirrored every other copy so the loop has no seam. */}
        <div className="st-pan st-far-pan st-far">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn('st-far-tile', i % 2 === 1 && 'st-mirror')} />
          ))}
        </div>
        <div className="st-haze" />

        {/* Now and then a carrier pigeon with a letter crosses the far sky (Yarrell, 1843). */}
        <div className="st-pigeon-path">
          <span className="st-pigeon" />
        </div>

        {/* Middle: railings and gas lamps. */}
        <div className="st-pan st-mid">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="st-lamp" style={{ '--x': (0.3 + i * LAMP_STEP).toFixed(3), '--flicker': `${-(i * 1.7) % 7}s` } as React.CSSProperties}>
              <span className="st-halo" />
              <span className="st-lamp-post" />
              <span className="st-flame" />
              {MOTHS.slice(0, i % 2 === 0 ? 2 : 1).map((moth, m) => (
                <span
                  key={m}
                  className={cn('st-orbit', m === 1 && 'st-orbit-back')}
                  style={{ '--lap': `${moth.lap + (i % 3) * 0.6}s`, '--lap-delay': `${moth.delay - i * 0.9}s`, '--reach': moth.reach } as React.CSSProperties}
                >
                  <span className="st-moth" />
                </span>
              ))}
            </div>
          ))}
          <div className="st-railing" />
        </div>

        <div className="st-mist st-mist-a" />

        {/* The road: now and then a hansom cab trots past behind the pavement (OpenClipart, after a public-domain drawing). */}
        <div className="st-cab">
          <span className="st-cab-body" />
          <span className="st-cab-wheel" />
        </div>

        {/* Front: the street with its standing townsfolk; copies so it can loop. */}
        <div className="st-pan st-street">
          <div className="st-cobbles" />
          {[0, 1, 2].flatMap((copy) =>
            STANDING.map((person) => (
              <div
                key={`${copy}-${person.name}`}
                className="st-stand"
                style={{ '--x': (person.x + copy * STREET_PERIOD).toFixed(3), '--fh': person.size } as React.CSSProperties}
              >
                <CutOut name={person.name} size={person.size} className={person.idle} />
              </div>
            )),
          )}
          {/* The newsboy on his crate; only the paper moves, turning in his fist. */}
          {[0, 1, 2].map((copy) => (
            <div key={`newsboy-${copy}`} className="st-newsboy" style={{ '--x': (NEWSBOY.x + copy * STREET_PERIOD).toFixed(3) } as React.CSSProperties}>
              <CutOut name="newsboy" size={NEWSBOY.size}>
                <span className="st-piece" />
                <span className="st-piece st-news-paper" />
              </CutOut>
            </div>
          ))}
        </div>

        {WALKERS.map((walker) => (
          <Lane key={walker.name} walker={walker} />
        ))}

        <div className="st-mist st-mist-b" />
        <div className="st-grain" />
        <div className="st-vignette" />
      </div>
      <div className="st-controls">
        <SoundToggle />
        <button
          type="button"
          className="st-toggle st-motion"
          onClick={() => setReaderPref('banner', paused ? 'moving' : 'still')}
          aria-pressed={paused}
          title={paused ? t.street.playTitle : t.street.pauseTitle}
        >
          {/* Play: a typeset triangle (U+25B6 with U+FE0E, so phones never draw an emoji); pause: two printer's rules. */}
          {paused ? (
            <span aria-hidden="true" className="st-mark">{'\u25B6\uFE0E'}</span>
          ) : (
            <span aria-hidden="true" className="st-mark st-mark-pause" />
          )}
          <span className="st-label">{paused ? t.street.play : t.street.pause}</span>
          <span className="sr-only">{t.street.motionSr}</span>
        </button>
      </div>
    </div>
  );
}
