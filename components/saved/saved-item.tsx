'use client';

import { memo, useMemo } from 'react';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { StoryLink } from '@/components/story/story-link';
import { Ornament } from '@/components/site/ornament';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatReadingTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import { cleanText } from '@/lib/text';
import type { FeedArticle, SavedArticle, SavedFolder } from '@/lib/types';
import { cn } from '@/lib/utils';

type SavedItemProps = {
  article: SavedArticle;
  folders: SavedFolder[];
  onOpen: (article: SavedArticle) => void;
  onMove: (article: SavedArticle, folderId: string | null) => void;
  onNewFolder: (article: SavedArticle) => void;
  onRemove: (article: SavedArticle) => void;
};

/**
 * One saved story, kept short: no excerpt. On a phone a small picture sits beside the section and the byline, the
 * headline runs the full width under them, then one ruled line with two matching buttons: the story's folder
 * ("Unfiled ▾" or its name; pressing it picks another) and Remove, led by the scissors. From 640px the picture
 * stands in its own column beside all three.
 */
function SavedItemImpl({ article, folders, onOpen, onMove, onNewFolder, onRemove }: SavedItemProps) {
  const folder = folders.find((f) => f.id === article.folder_id);
  // The story as the quick-read sheet wants it, so it opens at once from this copy.
  const story = useMemo<FeedArticle>(() => ({ ...article, id: article.article_id, author: null, is_saved: true }), [article]);
  const title = cleanText(article.title);
  const { t, fmt, rich } = useI18n();
  const w = t.saved.item;
  const readingTime = formatReadingTime(article.reading_minutes);

  return (
    <article className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 py-3.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-x-5 sm:py-4">
      <StoryLink
        article={story}
        onClick={() => onOpen(article)}
        tabIndex={-1}
        aria-hidden="true"
        className="photo-plate relative col-start-1 row-start-1 self-start sm:row-span-3"
      >
        {/* The picture stays clean: a story already opened is told by its softer headline, not a mark on the photo. */}
        <ArticleImage src={article.image_url} alt="" category={article.category_name} width={300} sizes="(min-width: 640px) 8.5rem, 4.5rem" className="aspect-4/3 w-full" />
      </StoryLink>

      <p className="byline col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 self-center text-[0.75rem] leading-snug sm:self-start sm:text-[0.8rem]">
        <CategoryBadge name={article.category_name} className="mr-0.5 px-1.5 py-0 text-[0.62rem] sm:text-[0.66rem]" />
        <span>{article.source_name}</span>
        <span aria-hidden="true">·</span>
        <span>{rich(w.saved, { time: <TimeAgo date={article.saved_at} /> })}</span>
        {readingTime && (
          <>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">{readingTime}</span>
          </>
        )}
        {/* Said in words for screen readers; the eye sees the softer headline. */}
        {article.is_read && <span className="sr-only">{w.read}</span>}
      </p>

      <h2
        className={cn(
          'headline col-span-2 row-start-2 mt-2 text-[1.15rem] leading-snug sm:col-span-1 sm:col-start-2 sm:mt-1 sm:text-[1.3rem]',
          article.is_read && 'text-foreground/60',
        )}
      >
        <StoryLink article={story} onClick={() => onOpen(article)} className="decoration-1 underline-offset-4 hover:underline">
          {title}
        </StoryLink>
      </h2>

      {/*
        * One ruled line, the same on every width: two hairline buttons of one height, side by side. The folder button
        * names the story's folder (or Unfiled) and opens the list of folders; Remove keeps its own size at the far end.
        * Its menu keeps clear of the phone's bottom tab bar and the header, flipping up when there is no room below.
        */}
      <div className="col-span-2 row-start-3 mt-2.5 flex items-center gap-2.5 border-t border-rule/30 pt-2.5 sm:col-span-1 sm:col-start-2 sm:mt-3 sm:gap-4 sm:pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="folder-button min-w-0 flex-1 justify-start gap-1 px-2 text-[0.88rem] min-[360px]:gap-2 min-[360px]:px-3 min-[360px]:text-[0.95rem] sm:max-w-72"
              aria-label={fmt(w.folderLabel, { name: folder ? folder.name : w.unfiled })}
            >
              <Ornament name="label" className="folder-button-mark h-[1.05rem] [--ornament-ink:var(--brass-ink)]" />
              <span className={cn('min-w-0 flex-1 truncate text-left', !folder && 'font-normal italic text-muted-foreground')}>
                {folder ? folder.name : w.unfiled}
              </span>
              <span aria-hidden="true" className="shrink-0 text-[0.8rem] leading-none text-(--brass-ink)">
                ▾
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" collisionPadding={{ top: 72, bottom: 72, left: 8, right: 8 }} className="w-60">
            <DropdownMenuLabel>{w.putIn}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={article.folder_id ?? 'none'} onValueChange={(value) => onMove(article, value === 'none' ? null : value)}>
              <DropdownMenuRadioItem value="none">{w.noFolder}</DropdownMenuRadioItem>
              {folders.map((f) => (
                <DropdownMenuRadioItem key={f.id} value={f.id}>
                  {f.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onNewFolder(article)}>{w.newFolder}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          onClick={() => onRemove(article)}
          data-save-button=""
          className="shrink-0 gap-1.5 px-2 text-[0.88rem] text-foreground/85 min-[360px]:text-[0.95rem] hover:text-destructive min-[360px]:gap-2 min-[360px]:px-3 sm:ml-auto sm:px-4"
        >
          <Ornament name="scissors" className="h-[0.65rem] [--ornament-ink:currentColor] min-[360px]:h-[0.8rem] sm:h-[0.9rem]" /> {w.remove}
        </Button>
      </div>
    </article>
  );
}

export const SavedItem = memo(SavedItemImpl);
