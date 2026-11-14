import { useId } from 'react';
import Link from 'next/link';
import { Engraving } from '@/components/site/engraving';
import { siteConfig } from '@/lib/site';
import { cn } from '@/lib/utils';

/** The newspaper title in blackletter, as a link; it glows softly when pointed at (styles: .masthead-glow). Size it with a text-* class. */
export function Masthead({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('masthead-glow inline-block font-masthead font-normal leading-[1.05] tracking-normal', className)}>
      {siteConfig.masthead}
    </Link>
  );
}

/** The masthead at a size for small headers (auth, setup, admin and error pages). */
export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return <Masthead href={href} className={cn('text-3xl', className)} />;
}

/**
 * The motto printed on an engraved ribbon under the title, set along the
 * arch of the ribbon's band. The SVG uses the engraving's own pixel grid
 * (873 x 300); the curve follows the middle of the band, measured from the
 * image, a little low so the letters sit centred on it.
 */
export function MottoRibbon() {
  const pathId = `motto-arc-${useId().replace(/:/g, '')}`;
  return (
    <div className="relative mx-auto mt-1 w-[18rem] sm:w-[21rem] xl:w-[23rem]">
      <Engraving name="ribbon" className="w-full" />
      <svg viewBox="0 0 873 300" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={siteConfig.motto}>
        <path id={pathId} d="M 92 91 Q 420 41 748 95" fill="none" />
        <text className="fill-current font-serif italic" fontSize="37" aria-hidden="true">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle" textLength="600" lengthAdjust="spacing">
            {siteConfig.motto}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
