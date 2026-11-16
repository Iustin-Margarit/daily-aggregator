import { Engraving, type EngravingName } from '@/components/site/engraving';
import { cn } from '@/lib/utils';

/** The title block of an inner page (Saved, Sections, Settings), the same on each. */
export function PageHeader({
  kicker,
  title,
  description,
  engraving,
  compact = false,
  className,
}: {
  /** The small line above the title; left out where the title says it all. */
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  engraving?: EngravingName;
  /** Phones: a smaller title and a tighter line under it (Sections, where the stamps must show at once). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col items-center text-center', className)}>
      {engraving && <Engraving name={engraving} className="mb-3 h-16 max-w-[8rem]" />}
      {kicker && <p className="kicker">{kicker}</p>}
      <h1 className={cn('headline sm:text-5xl', kicker && 'mt-1.5', compact ? 'text-[2rem]' : 'text-[2.4rem]')}>{title}</h1>
      {description && <p className={cn('mx-auto max-w-xl italic text-muted-foreground sm:mt-2.5 sm:text-[1.05rem]', compact ? 'mt-1 text-pretty text-[0.98rem]' : 'mt-2.5 text-[1.05rem]')}>{description}</p>}
    </header>
  );
}
