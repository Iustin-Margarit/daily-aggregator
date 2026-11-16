'use client';

import Link from 'next/link';
import { storyPath } from '@/lib/routes';
import { isPlainPress, loadStoryDetail, openSheet } from '@/lib/story-cache';

type SheetLinkProps = Omit<React.ComponentProps<typeof Link>, 'href' | 'prefetch'> & {
  slug: string;
  /** From inside the sheet: take the open story's place (Close still returns to the page underneath). */
  replace?: boolean;
};

/**
 * A link to a story known only by its slug (the lists at the foot of the sheet, hidden stories in Settings):
 * a plain press opens it in the paper's one sheet (lib/story-cache.ts), fetched when pointed at so it is often
 * there before the press. A new tab or window still gets the story's own page.
 */
export function SheetLink({ slug, replace = false, onClick, onPointerEnter, ...props }: SheetLinkProps) {
  return (
    <Link
      href={storyPath(slug)}
      prefetch={false}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') loadStoryDetail(slug);
        onPointerEnter?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!isPlainPress(event)) return;
        event.preventDefault();
        openSheet(slug, { replace });
      }}
      {...props}
    />
  );
}
