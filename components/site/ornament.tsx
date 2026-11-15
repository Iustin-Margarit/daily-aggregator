import { cn } from '@/lib/utils';

/**
 * Small public-domain ornaments (credits in docs/ASSETS.md), stored as
 * black-on-transparent masks in public/ornaments and printed in brass
 * (--ink-gold) or in --ornament-ink. Width and height are the file's pixels,
 * used for the aspect ratio.
 */
const ORNAMENTS = {
  magnifier: [77, 160],
  globe: [109, 128],
  seal: [160, 155],
  star: [96, 86],
  moth: [96, 55],
  pigeon: [120, 92],
  'postmark-ring': [240, 233],
  'postmark-bars': [113, 200],
  scissors: [160, 53],
  gramophone: [150, 172],
  fist: [160, 81],
  // A Spencerian scroll flourish and a smaller tulip flourish (dividers and tailpieces).
  flourish: [640, 145],
  tailpiece: [480, 100],
  // The nib of a dip pen ("For you": the edition written for the reader).
  nib: [160, 147],
  // The engraved frame of the illuminated initial (styles: .initial).
  'initial-frame': [240, 240],
  // The account menu: the morning sun, the man in the moon, and a key for logging out.
  sun: [123, 128],
  moon: [128, 128],
  key: [160, 53],
  // The main tabs: a folded broadsheet (Front Page) and the Penny Black, perforated (Sections).
  broadsheet: [136, 108],
  stamp: [132, 154],
  // A funnel from A. Pforr's US patent drawing (1875): the front page's Filters button.
  funnel: [110, 160],
  // Spectacles (Pearson Scott Foresman line art): "Read on [source]", the story at its own paper.
  spectacles: [160, 81],
} as const;

export type OrnamentName = keyof typeof ORNAMENTS;

export function Ornament({ name, className, style }: { name: OrnamentName; className?: string; style?: React.CSSProperties }) {
  const [width, height] = ORNAMENTS[name];
  return (
    <span
      aria-hidden="true"
      className={cn('ornament-mask', className)}
      style={{ '--ornament': `url(/ornaments/${name}.webp)`, aspectRatio: `${width} / ${height}`, ...style } as React.CSSProperties}
    />
  );
}
