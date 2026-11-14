import { getCategoryStyle } from '@/lib/category-styles';
import { cn } from '@/lib/utils';

/** The section name in its own muted ink, e.g. "World" in dusty blue. */
export function CategoryBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span data-section={getCategoryStyle(name).key ?? undefined} className={cn('section-badge', className)}>
      {name}
    </span>
  );
}
