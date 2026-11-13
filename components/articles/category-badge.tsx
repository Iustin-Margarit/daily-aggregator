import { cn } from '@/lib/utils';

/** Section label printed above a headline, e.g. "WORLD". */
export function CategoryBadge({ name, className }: { name: string; className?: string }) {
  return <span className={cn('kicker', className)}>{name}</span>;
}
