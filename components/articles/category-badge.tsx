'use client';

import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/** The section name in its own muted ink and the reader's language, e.g. "World" ("Monde") in dusty blue. */
export function CategoryBadge({ name, className }: { name: string; className?: string }) {
  const { t } = useI18n();
  const { key } = getCategoryStyle(name);
  return (
    <span data-section={key ?? undefined} className={cn('section-badge', className)}>
      {sectionText(t, key, name).name}
    </span>
  );
}
