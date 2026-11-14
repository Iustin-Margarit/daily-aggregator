'use client';

import { memo } from 'react';
import Link from 'next/link';
import { EyeOff, Share2, SquareArrowOutUpRight, VolumeX } from 'lucide-react';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { DropCap } from '@/components/articles/drop-cap';
import { ActionDivider, MoreButton, SaveButton } from '@/components/articles/story-actions';
import { TopStoryStamp } from '@/components/articles/top-story-stamp';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { TimeAgo } from '@/components/site/time-ago';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatReadingTime } from '@/lib/format';
import { cleanText } from '@/lib/text';
import type { FeedArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

export type StoryVariant = 'lead' | 'standard' | 'compact';

type ArticleCardProps = {
  article: FeedArticle;
  userId: string | null;
  onHide?: (article: FeedArticle) => void;
  onMuteSource?: (article: FeedArticle) => void;
  eagerImage?: boolean;
  variant?: StoryVariant;
};

/**
 * Save and More: two things to press, no more
 * (components/articles/story-actions.tsx). The first one starts flush with
 * the text above it.
 */
function StoryActions({ article, userId, onHide, onMuteSource }: Omit<ArticleCardProps, 'eagerImage' | 'variant'>) {
  const { saved, busy, toggleSave, share } = useArticleActions(article, userId);
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      <SaveButton saved={saved} disabled={busy} onToggle={toggleSave} className="pl-0" />
      <ActionDivider />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreButton />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem asChild>
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              <SquareArrowOutUpRight className="mr-2.5 h-4 w-4" /> Read on {article.source_name}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={share}>
            <Share2 className="mr-2.5 h-4 w-4" /> Share
          </DropdownMenuItem>
          {userId && (onHide || onMuteSource) && <DropdownMenuSeparator />}
          {userId && onHide && (
            <DropdownMenuItem onSelect={() => onHide(article)}>
              <EyeOff className="mr-2.5 h-4 w-4" /> Hide this story
            </DropdownMenuItem>
          )}
          {userId && onMuteSource && (
            <DropdownMenuItem onSelect={() => onMuteSource(article)}>
              <VolumeX className="mr-2.5 h-4 w-4" /> Mute {article.source_name}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Byline({ article, withAuthor = false, className }: { article: FeedArticle; withAuthor?: boolean; className?: string }) {
  const author = withAuthor && article.author ? cleanText(article.author) : null;
  const readingTime = formatReadingTime(article.reading_minutes);
  return (
    <p className={cn('byline flex min-w-0 flex-wrap items-center gap-x-1.5', className)}>
      {author && (
        <>
          <span className="truncate">By {author}</span>
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
function ArticleCardImpl({ article, userId, onHide, onMuteSource, eagerImage, variant = 'standard' }: ArticleCardProps) {
  const href = `/article/${article.slug}`;
  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const section = getCategoryStyle(article.category_name).key ?? undefined;
  const actions = <StoryActions article={article} userId={userId} onHide={onHide} onMuteSource={onMuteSource} />;

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
        <div className="pt-5 sm:pt-6">
          <CategoryBadge name={article.category_name} />
          <h2 className="headline mt-3 text-[1.85rem] sm:text-[2.5rem] lg:text-[2.85rem]">
            <Link href={href} className="decoration-2 underline-offset-4 hover:underline">
              {title}
            </Link>
          </h2>
          <Byline article={article} withAuthor className="mt-3" />
          {summary && <DropCap text={summary} className="news-text mt-5 text-[1.08rem] leading-relaxed text-foreground/90" />}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-double border-rule/40 pt-3">
            <Link
              href={href}
              className="group/read inline-flex items-center gap-2.5 font-display text-[1.05rem] font-semibold text-(--brass-ink) hover:text-foreground"
            >
              Read dispatch
              <Ornament name="fist" className="fist-poke h-[1rem] [--ornament-ink:currentColor]" />
            </Link>
            {actions}
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
        <div className="mt-auto pt-2">{actions}</div>
      </div>
    </article>
  );
}

export const ArticleCard = memo(ArticleCardImpl);
