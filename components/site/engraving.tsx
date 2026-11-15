import { cn } from '@/lib/utils';

/**
 * Public-domain engravings (docs/ASSETS.md), stored as black-on-transparent
 * masks in public/engravings and printed in the current ink colour, so they
 * follow the theme like text does. Width and height are the file's pixels,
 * used for the aspect ratio.
 */
const ENGRAVINGS = {
  world: [356, 356],
  politics: [420, 297],
  business: [400, 393],
  technology: [440, 163],
  science: [187, 400],
  health: [301, 372],
  sports: [567, 400],
  entertainment: [380, 278],
  press: [362, 440],
  newsboy: [258, 420],
  quill: [157, 314],
  ribbon: [873, 300],
  // A Morse telegraph key: the wire news ("In other news").
  telegraph: [440, 189],
  // A printer's workshop (woodcut): the Settings page. A typewriter: the reading preferences.
  'printing-office': [402, 520],
  typewriter: [360, 312],
  // Kittens by Théophile Steinlen ("It Burns!", 1898): the office cats.
  'kitten-sit': [197, 222],
  'kitten-curious': [176, 200],
  'kitten-peer': [249, 162],
  'kitten-pounce': [304, 227],
  // Edward Penfield's woodcut calendar, one scene for each month.
  'month-january': [720, 427],
  'month-february': [720, 422],
  'month-march': [720, 428],
  'month-april': [720, 418],
  'month-may': [720, 411],
  'month-june': [720, 430],
  'month-july': [720, 412],
  'month-august': [720, 419],
  'month-september': [720, 416],
  'month-october': [720, 420],
  'month-november': [720, 457],
  'month-december': [720, 410],
} as const;

export type EngravingName = keyof typeof ENGRAVINGS;

type EngravingProps = {
  name: EngravingName;
  className?: string;
  /** Describe the picture when it carries meaning; leave out for decoration. */
  label?: string;
  /** Mirror left to right. */
  flip?: boolean;
  /** Fade the edges into the paper (for rectangular woodcuts). */
  soft?: boolean;
};

export function Engraving({ name, className, label, flip = false, soft = false }: EngravingProps) {
  const [width, height] = ENGRAVINGS[name];
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('engraving', soft && 'engraving-soft', flip && '-scale-x-100', className)}
      style={
        {
          '--engraving': `url(/engravings/${name}.webp)`,
          aspectRatio: `${width} / ${height}`,
        } as React.CSSProperties
      }
    />
  );
}
