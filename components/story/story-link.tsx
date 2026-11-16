'use client';

import Link from 'next/link';
import { storyPath } from '@/lib/routes';
import { markSheetOverPage, rememberStory } from '@/lib/story-cache';
import type { FeedArticle } from '@/lib/types';

type StoryLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'> & { article: FeedArticle };

/**
 * A link to a story: it opens the quick-read sheet over the page, at once, with the copy of the
 * story the card already shows (the server's copy follows).
 */
export function StoryLink({ article, onClick, ...props }: StoryLinkProps) {
  return (
    <Link
      href={storyPath(article.slug)}
      onClick={(event) => {
        rememberStory(article);
        markSheetOverPage(true);
        onClick?.(event);
      }}
      {...props}
    />
  );
}
