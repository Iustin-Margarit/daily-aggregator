'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { storyPath } from '@/lib/routes';
import { isPlainPress, notePrintedStory, openSheet, rememberStory } from '@/lib/story-cache';
import type { FeedArticle } from '@/lib/types';

type StoryLinkProps = Omit<React.ComponentProps<typeof Link>, 'href' | 'prefetch'> & { article: FeedArticle };

/**
 * A link to a story: a plain press opens the paper's quick-read sheet over the page at once, with the copy of
 * the story the card already shows (components/story/quick-read.tsx, QuickReadHost); no route visit, so nothing
 * is prefetched. A new tab or window gets the story's own page. A link a reader can reach with the keyboard
 * (the headline, not the photograph's twin link) carries `data-story-link`, which j / k move between
 * (components/site/keyboard-reading.tsx).
 */
export function StoryLink({ article, onClick, ...props }: StoryLinkProps) {
  const reachable = props.tabIndex !== -1;
  useEffect(() => {
    if (reachable) notePrintedStory(article);
  }, [article, reachable]);
  return (
    <Link
      href={storyPath(article.slug)}
      prefetch={false}
      data-story-link={reachable ? article.slug : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!isPlainPress(event)) return;
        event.preventDefault();
        rememberStory(article);
        openSheet(article.slug);
      }}
      {...props}
    />
  );
}
