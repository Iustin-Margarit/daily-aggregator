'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { DropCap } from '@/components/articles/drop-cap';
import { ActionDivider, ReadOnLink, SaveButton, ShareButton } from '@/components/articles/story-actions';
import { TopStoryStamp } from '@/components/articles/top-story-stamp';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { TimeAgo } from '@/components/site/time-ago';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatReadingTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import { cleanText } from '@/lib/text';
import type { FeedArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

export type StoryVariant = 'lead' | 'standard' | 'compact';

type ArticleCardProps = {
  article: FeedArticle;
  userId: string | null;
  eagerImage?: boolean;
  variant?: StoryVariant;
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
  const { t, fmt, locale } = useI18n();
  const author = withAuthor && article.author ? cleanText(article.author) : null;
  const readingTime = formatReadingTime(article.reading_minutes, locale);
  return (
    <p className={cn('byline flex min-w-0 flex-wrap items-center gap-x-1.5', className)}>
      {author && (
        <>
          <span className="truncate">{fmt(t.story.by, { author })}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span className="truncate font-medium text-foreground/80">{article.source_name}</span>
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
function ArticleCardImpl({ article, userId, eagerImage, variant = 'standard' }: ArticleCardProps) {
  const href = `/article/${article.slug}`;
  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const section = getCategoryStyle(article.category_name).key ?? undefined;
  const { t } = useI18n();

  if (variant === 'lead') {
    return (
      <article className="flex h-full w-full flex-col" data-section={section}>
        <figure className="relative lg:min-h-[26rem] lg:flex-1">
          <Link href={href} tabIndex={-1} aria-hidden="true" className="photo-plate h-full">
            {/* On desktops the photo fills the plate inside its 4px mount (.photo-plate). */}
            <ArticleImage
              src={article.image_url}
              alt=""
              category={article.category_name}
              width={1400}
              eager={eagerImage}
              className="aspect-video w-full lg:absolute lg:inset-1 lg:aspect-auto lg:h-[calc(100%-0.5rem)] lg:w-[calc(100%-0.5rem)]"
            />
          </Link>
          <TopStoryStamp className="absolute right-3 top-3 z-10 h-20 w-20 rotate-12 drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)] sm:right-5 sm:top-5 sm:h-24 sm:w-24" />
        </figure>
        {/*
         * On desktops the headline is printed above the photograph, as broadsheets do, so it shows
         * on a laptop screen without scrolling; on smaller screens the photo leads.
         */}
        <div className="pt-5 sm:pt-6 lg:contents">
          <div className="lg:order-first lg:pb-5">
            <CategoryBadge name={article.category_name} />
            <h2 className="headline mt-3 text-[1.85rem] sm:text-[2.5rem] lg:text-[2.85rem]">
              <Link href={href} className="decoration-2 underline-offset-4 hover:underline">
                {title}
              </Link>
            </h2>
            <Byline article={article} withAuthor className="mt-3" />
          </div>
          {summary && <DropCap text={summary} className="news-text mt-5 text-[1.08rem] leading-relaxed text-foreground/90" />}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-double border-rule/40 pt-3">
            <Link
              href={href}
              className="group/read inline-flex items-center gap-2.5 font-display text-[1.05rem] font-semibold text-(--brass-ink) hover:text-foreground"
            >
              {t.story.readDispatch}
              <Ornament name="fist" className="fist-poke h-[1rem] [--ornament-ink:currentColor]" />
            </Link>
            {/* Fills the rest of the line beside "Read dispatch", or takes a line of its own when that is too narrow. */}
            <StoryActions article={article} userId={userId} className="min-w-[17rem] flex-1" />
          </div>
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
            <Link href={href} className="line-clamp-3 decoration-1 underline-offset-2 hover:underline">
              {title}
            </Link>
          </h3>
          <Byline article={article} className="mt-1.5" />
        </div>
        {article.image_url && (
          <Link href={href} tabIndex={-1} aria-hidden="true" className="photo-plate mt-1 w-20 shrink-0 self-start sm:w-24">
            <ArticleImage src={article.image_url} alt="" category={article.category_name} width={240} className="aspect-square w-full" />
          </Link>
        )}
      </article>
    );
  }

  return (
    <article className="content-auto flex h-full w-full flex-col" data-section={section}>
      <Link href={href} tabIndex={-1} aria-hidden="true" className="photo-plate">
        <ArticleImage
          src={article.image_url}
          alt=""
          category={article.category_name}
          width={800}
          eager={eagerImage}
          className="aspect-[16/10] w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col pt-4">
        <CategoryBadge name={article.category_name} className="self-start" />
        <h3 className="headline mt-2.5 text-[1.32rem]">
          <Link href={href} className="line-clamp-3 decoration-1 underline-offset-2 hover:underline">
            {title}
          </Link>
        </h3>
        {summary && <p className="mt-2 line-clamp-3 text-[0.97rem] leading-relaxed text-foreground/80">{summary}</p>}
        <Byline article={article} className="mt-3" />
        <StoryActions article={article} userId={userId} className="mt-auto pt-2" />
      </div>
    </article>
  );
}

export const ArticleCard = memo(ArticleCardImpl);
