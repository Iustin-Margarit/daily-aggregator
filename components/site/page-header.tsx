import { Engraving, type EngravingName } from '@/components/site/engraving';
import { cn } from '@/lib/utils';

/** The title block of an inner page (Saved, Sections, Settings), the same on each. */
export function PageHeader({
  kicker,
  title,
  description,
  engraving,
  className,
}: {
  kicker: string;
  title: string;
  description?: React.ReactNode;
  engraving?: EngravingName;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col items-center text-center', className)}>
      {engraving && <Engraving name={engraving} className="mb-3 h-16 max-w-[8rem]" />}
      <p className="kicker">{kicker}</p>
      <h1 className="headline mt-1.5 text-[2.4rem] sm:text-5xl">{title}</h1>
      {description && <p className="mx-auto mt-2.5 max-w-xl text-[1.05rem] italic text-muted-foreground">{description}</p>}
    </header>
  );
}
