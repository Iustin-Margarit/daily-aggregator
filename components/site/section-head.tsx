import { Engraving, type EngravingName } from '@/components/site/engraving';
import { cn } from '@/lib/utils';

/**
 * A broadsheet section header, ═══ ✦ IN OTHER NEWS ✦ ═══, optionally with a
 * small engraving before the words (a telegraph key for the wire news, the
 * printing press for the latest dispatches).
 */
export function SectionHead({
  id,
  engraving,
  className,
  children,
}: {
  id?: string;
  engraving?: EngravingName;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className={cn('section-head', className)}>
      {engraving ? (
        <span className="inline-flex items-center gap-2.5">
          <Engraving name={engraving} className="h-[1.85em] max-w-[4.2em] max-[319px]:hidden" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </h2>
  );
}
