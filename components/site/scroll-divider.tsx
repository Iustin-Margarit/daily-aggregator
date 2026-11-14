import { Ornament } from '@/components/site/ornament';
import { cn } from '@/lib/utils';

/**
 * A Victorian scrollwork divider between the zones of a page (the masthead,
 * the lead story, the columns): a double hairline each side of an engraved
 * Spencerian flourish, or of the smaller tulip flourish for lesser breaks.
 */
export function ScrollDivider({ small = false, className }: { small?: boolean; className?: string }) {
  return (
    <div className={cn('scroll-divider', className)} role="presentation">
      {/*
       * Nudged so the ornament's knot, not its picture frame, sits on the rules:
       * the flourish's ink centre is 5.1% above the middle of its image, the
       * tailpiece's 3.6% below (measured from the files).
       */}
      <Ornament
        name={small ? 'tailpiece' : 'flourish'}
        className={small ? 'w-[8.5rem] -translate-y-[3.6%] sm:w-[10rem]' : 'w-[10.5rem] translate-y-[5.1%] sm:w-[13rem] lg:w-[15rem]'}
      />
    </div>
  );
}
