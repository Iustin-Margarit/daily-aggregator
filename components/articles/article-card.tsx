'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ArticleImage, GRID_SIZES } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { DropCap } from '@/components/articles/drop-cap';
import { ActionDivider, ReadOnLink, SaveButton, ShareButton } from '@/components/articles/story-actions';
import { TopStoryStamp } from '@/components/articles/top-story-stamp';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { TimeAgo } from '@/components/site/time-ago';
import { StoryLink } from '@/components/story/story-link';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatReadingTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import { paperPath } from '@/lib/routes';
import { cleanText } from '@/lib/text';
import type { FeedArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

/** The grid's picture: a small thumbnail in a phone's story row, the column's width from 640px. */
const PHONE_ROW_SIZES = `(max-width: 639px) min(38vw, 10rem), ${GRID_SIZES}`;

export type StoryVariant = 'lead' | 'standard' | 'compact' | 'digest';

type ArticleCardProps = {
  article: FeedArticle;
  userId: string | null;
  eagerImage?: boolean;
  variant?: StoryVariant;
  /** The lead on the front page itself: franked with the red Top story seal. */
  topStory?: boolean;
};

/**
 * Save and Share, printed in the open like a line of type, and "Read on
 * [source]" framed apart as the way out to the publisher's site
 * (components/articles/story-actions.tsx), nothing behind a menu. In a story
 * card (narrower than 34rem: every card on a phone and in the desktop grid)
 * Save and Share share a line and the framed "Read on" spans the card under
 * them, so every card in a row looks the same whatever its source is called.
 * Where there is room (the lead story on a wide screen) all three sit on one
 * line. Everything starts flush with the text above it.
 */
function StoryActions({ article, userId, className }: { article: FeedArticle; userId: string | null; className?: string }) {
  const { saved, busy, toggleSave, share } = useArticleActions(article, userId);
  return (
    <div className={cn('@container', className)}>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 @[34rem]:justify-end">
        <SaveButton saved={saved} disabled={busy} onToggle={toggleSave} className="pl-0" />
        <ActionDivider />
        <ShareButton onShare={share} />
        <ReadOnLink url={article.url} source={article.source_name} className="basis-full @[34rem]:ml-2 @[34rem]:basis-auto" />
      </div>
    </div>
  );
}

function Byline({ article, withAuthor = false, className }: { article: FeedArticle; withAuthor?: boolean; className?: string }) {
  const { t, fmt } = useI18n();
  const author = withAuthor && article.author ? cleanText(article.author) : null;
  const readingTime = formatReadingTime(article.reading_minutes);
  return (
    <p className={cn('byline flex min-w-0 flex-wrap items-center gap-x-1.5', className)}>
      {author && (
        <>
          <span className="truncate">{fmt(t.story.by, { author })}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <Link href={paperPath(article.source_name)} className="truncate font-medium text-foreground/80 underline-offset-2 hover:underline">
        {article.source_name}
      </Link>
      <span aria-hidden="true">·</span>
      <TimeAgo date={article.published_at} />
      {readingTime && (
        <>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{readingTime}</span>
        </>
      )}
    </p>
  );
}

/**
 * One story, printed straight on the page (the grid around it draws the
 * column rules). Photographs sit in a dark photo plate (.photo-plate).
 */
function ArticleCardImpl({ article, userId, eagerImage, variant = 'standard', topStory = false }: ArticleCardProps) {
  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const section = getCategoryStyle(article.category_name).key ?? undefined;
  const { t } = useI18n();

  if (variant === 'lead') {
    return (
      <article className="flex h-full w-full flex-col" data-section={section}>
        <figure className="relative lg:min-h-[26rem] lg:flex-1">
          <StoryLink article={article} tabIndex={-1} aria-hidden="true" className="photo-plate h-full">
            {/* On desktops the photo fills the plate inside its 4px mount (.photo-plate). */}
            <ArticleImage
              src={article.image_url}
              alt=""
              category={article.category_name}
              width={1400}
              // Phones and tablets: the full width. Desktops: the lead column, cropped to fill a plate taller than the photo.
              sizes="(min-width: 1024px) min(75vw, 1100px), 100vw"
              eager={eagerImage}
              className="aspect-video w-full lg:absolute lg:inset-1 lg:aspect-auto lg:h-[calc(100%-0.5rem)] lg:w-[calc(100%-0.5rem)]"
            />
          </StoryLink>
          {topStory && <TopStoryStamp className="absolute right-3 top-3 z-10 h-20 w-20 rotate-12 drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)] sm:right-5 sm:top-5 sm:h-24 sm:w-24" />}
        </figure>
        {/*
         * The headline is printed above the photograph, as broadsheets do, so the news shows on the
         * first screen of a laptop or a phone without scrolling past the picture.
         */}
        <div className="contents">
          <div className="order-first pb-4 lg:pb-5">
            <CategoryBadge name={article.category_name} />
            <h2 className="headline mt-2.5 text-[1.7rem] sm:mt-3 sm:text-[2.5rem] lg:text-[2.85rem]">
              <StoryLink article={article} className="decoration-2 underline-offset-4 hover:underline">
                {title}
              </StoryLink>
            </h2>
            <Byline article={article} withAuthor className="mt-2 sm:mt-3" />
          </div>
          {summary && <DropCap text={summary} className="news-text mt-4 text-[1.08rem] leading-relaxed text-foreground/90 sm:mt-5" />}
          {/* Phones: like the story rows, Save and Share wait in the quick-read sheet, so the next headlines come sooner. */}
          <div className="mt-5 hidden flex-wrap items-center justify-between gap-3 border-t-[3px] border-double border-rule/40 pt-3 sm:flex">
            <StoryLink
              article={article}
              className="group/read inline-flex items-center gap-2.5 font-display text-[1.05rem] font-semibold text-(--brass-ink) hover:text-foreground"
            >
              {t.story.readDispatch}
              <Ornament name="fist" className="fist-poke h-[1rem] [--ornament-ink:currentColor]" />
            </StoryLink>
            {/* Fills the rest of the line beside "Read dispatch", or takes a line of its own when that is too narrow. */}
            <StoryActions article={article} userId={userId} className="min-w-[min(17rem,100%)] flex-1" />
          </div>
        </div>
      </article>
    );
  }

  // A section's photograph on the front page: the picture, the headline and its byline (its section is the digest's head).
  if (variant === 'digest') {
    return (
      // Phones: a row like the lists (the picture small on the left); from 640px the picture across the column.
      <article className="flex w-full gap-3.5 sm:flex-col sm:gap-0" data-section={section}>
        <StoryLink article={article} tabIndex={-1} aria-hidden="true" className="photo-plate w-[38%] max-w-[10rem] shrink-0 self-start sm:w-auto sm:max-w-none">
          <ArticleImage
            src={article.image_url}
            alt=""
            category={article.category_name}
            width={800}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, (min-width: 640px) 100vw, min(38vw, 10rem)"
            eager={eagerImage}
            className="aspect-[4/3] w-full sm:aspect-[16/10]"
          />
        </StoryLink>
        <div className="min-w-0 flex-1">
          <h3 className="headline text-[1.08rem] leading-snug sm:mt-3 sm:text-[1.25rem] sm:leading-tight">
            <StoryLink article={article} className="line-clamp-4 decoration-1 underline-offset-2 hover:underline sm:line-clamp-3">
              {title}
            </StoryLink>
          </h3>
          <Byline article={article} className="mt-1.5" />
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="group flex gap-3.5" data-section={section}>
        <div className="min-w-0 flex-1">
          <CategoryBadge name={article.category_name} />
          <h3 className="headline mt-1.5 text-[1.1rem]">
            <StoryLink article={article} className="line-clamp-3 decoration-1 underline-offset-2 hover:underline">
              {title}
            </StoryLink>
          </h3>
          <Byline article={article} className="mt-1.5" />
        </div>
        {article.image_url && (
          <StoryLink article={article} tabIndex={-1} aria-hidden="true" className="photo-plate mt-1 w-20 shrink-0 self-start sm:w-24">
            <ArticleImage src={article.image_url} alt="" category={article.category_name} width={240} sizes="6rem" className="aspect-square w-full" />
          </StoryLink>
        )}
      </article>
    );
  }

  return (
    // Phones: one story per row, the picture small on the left and the headline beside it, so a screen
    // holds five or six stories (Save and Share are in the quick-read sheet). From 640px: the full card.
    <article className="content-auto flex h-full w-full gap-3.5 sm:flex-col sm:gap-0" data-section={section}>
      <StoryLink article={article} tabIndex={-1} aria-hidden="true" className="photo-plate w-[38%] max-w-[10rem] shrink-0 self-start sm:w-auto sm:max-w-none sm:self-auto">
        <ArticleImage
          src={article.image_url}
          alt=""
          category={article.category_name}
          width={800}
          sizes={PHONE_ROW_SIZES}
          eager={eagerImage}
          className="aspect-[4/3] w-full sm:aspect-[16/10]"
        />
      </StoryLink>
      <div className="flex min-w-0 flex-1 flex-col sm:pt-4">
        <div className="hidden sm:block">
          <CategoryBadge name={article.category_name} />
        </div>
        <h3 className="headline text-[1.08rem] leading-snug sm:mt-2.5 sm:text-[1.32rem] sm:leading-tight">
          <StoryLink article={article} className="line-clamp-4 decoration-1 underline-offset-2 hover:underline sm:line-clamp-3">
            {title}
          </StoryLink>
        </h3>
        {summary && <p className="mt-2 hidden text-[0.97rem] leading-relaxed text-foreground/80 sm:line-clamp-3">{summary}</p>}
        <Byline article={article} className="mt-1.5 sm:mt-3" />
        <StoryActions article={article} userId={userId} className="mt-auto hidden pt-2 sm:block" />
      </div>
    </article>
  );
}

export const ArticleCard = memo(ArticleCardImpl);
