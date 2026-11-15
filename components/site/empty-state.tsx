import type { LucideIcon } from 'lucide-react';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  /** A small icon, used when no engraving is given. */
  icon?: LucideIcon;
  /** An engraving that tells the story better than an icon (a curious kitten, the press, ...). */
  engraving?: EngravingName;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** The title's heading level in the page's outline: 1 when it is the whole page (not found, error), 2 right under the page title, 3 inside a titled part. */
  level?: 1 | 2 | 3;
  className?: string;
};

/** A friendly notice on a paper card, for empty lists and dead ends. */
export function EmptyState({ icon: Icon, engraving, title, description, action, level = 3, className }: EmptyStateProps) {
  const Heading = `h${level}` as const;
  return (
    <div className={cn('card-paper mx-auto flex max-w-2xl flex-col items-center px-8 py-12 text-center', className)}>
      {engraving ? (
        <Engraving name={engraving} className="mb-5 h-28 max-w-[11rem]" />
      ) : (
        Icon && (
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] border-[3px] border-double border-rule/35 bg-panel">
            <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.6} />
          </span>
        )
      )}
      <Heading className="headline text-2xl">{title}</Heading>
      {description && <div className="mt-2 max-w-md text-[0.98rem] text-muted-foreground">{description}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
