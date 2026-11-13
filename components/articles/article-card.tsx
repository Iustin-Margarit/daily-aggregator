'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Bookmark, EyeOff, Heart, MoreHorizontal, Share2, SquareArrowOutUpRight, VolumeX } from 'lucide-react';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { TimeAgo } from '@/components/site/time-ago';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const textAction =
  'label inline-flex h-8 items-center gap-1 text-[0.64rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40';

const Dot = () => (
  <span className="text-muted-foreground/50" aria-hidden="true">
    ·
  </span>
);

/** A printed line of small-caps actions under each story. */
function StoryActions({ article, userId, onHide, onMuteSource }: Omit<ArticleCardProps, 'eagerImage' | 'variant'>) {
  const { liked, likeCount, saved, busy, toggleLike, toggleSave, share } = useArticleActions(article, userId);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-dotted border-rule/50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy.like}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={cn(textAction, liked && 'text-(--ink-accent) hover:text-(--ink-accent)')}
        >
          <Heart className={cn('h-3 w-3', liked && 'fill-current')} />
          {liked ? 'Liked' : 'Like'}
          {likeCount > 0 && <span className="tabular-nums">({likeCount})</span>}
        </button>
        <Dot />
        <Link href={`/article/${article.slug}#comments`} className={textAction} aria-label={`Letters (${article.comment_count})`}>
          Letters{article.comment_count > 0 && <span className="tabular-nums">({article.comment_count})</span>}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSave}
          disabled={busy.save}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved stories' : 'Save for later'}
          className={cn(textAction, saved && 'text-foreground')}
        >
          <Bookmark className={cn('h-3 w-3', saved && 'fill-current')} />
          {saved ? 'Saved' : 'Save'}
        </button>
        <Dot />
        <DropdownMenu>
          <DropdownMenuTrigger className={textAction} aria-label="More options">
            More <MoreHorizontal className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem asChild>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <SquareArrowOutUpRight className="mr-2 h-4 w-4" /> Read on {article.source_name}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={share}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </DropdownMenuItem>
            {userId && (onHide || onMuteSource) && <DropdownMenuSeparator />}
            {userId && onHide && (
              <DropdownMenuItem onSelect={() => onHide(article)}>
                <EyeOff className="mr-2 h-4 w-4" /> Hide this story
              </DropdownMenuItem>
            )}
            {userId && onMuteSource && (
              <DropdownMenuItem onSelect={() => onMuteSource(article)}>
                <VolumeX className="mr-2 h-4 w-4" /> Mute {article.source_name}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Byline({ article, withAuthor = false }: { article: FeedArticle; withAuthor?: boolean }) {
  const author = withAuthor && article.author ? cleanText(article.author) : null;
  return (
    <p className="byline flex flex-wrap items-center gap-x-1.5">
      {author && (
        <>
          <span>By {author}</span>
          <span aria-hidden="true">|</span>
        </>
      )}
      <span className="text-foreground/75">{article.source_name}</span>
      <span aria-hidden="true">·</span>
      <TimeAgo date={article.published_at} />
    </p>
  );
}

function ArticleCardImpl({ article, userId, onHide, onMuteSource, eagerImage, variant = 'standard' }: ArticleCardProps) {
  const href = `/article/${article.slug}`;
  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const actions = <StoryActions article={article} userId={userId} onHide={onHide} onMuteSource={onMuteSource} />;

  if (variant === 'lead') {
    return (
      <article className="group">
        <CategoryBadge name={article.category_name} />
        <h2 className="headline mt-2 text-[2rem] sm:text-5xl lg:text-[3.4rem]">
          <Link href={href} className="decoration-2 underline-offset-4 hover:underline">
            {title}
          </Link>
        </h2>
        <div className="mt-3">
          <Byline article={article} withAuthor />
        </div>
        <figure className="mt-5">
          <Link href={href} tabIndex={-1} aria-hidden="true" className="block border border-rule p-1.5">
            <ArticleImage
              src={article.image_url}
              alt=""
              category={article.category_name}
              width={1400}
              eager={eagerImage}
              className="aspect-video w-full"
            />
          </Link>
          <figcaption className="mt-1.5 text-right text-xs italic text-muted-foreground">Photograph via {article.source_name}</figcaption>
        </figure>
        {summary && (
          <p
            className={cn(
              'news-text dropcap mt-4 text-[1.08rem] leading-relaxed',
              summary.length > 260 && 'sm:columns-2 sm:gap-8 [column-rule:1px_solid_hsl(var(--border))]',
            )}
          >
            {summary}
          </p>
        )}
        <div className="mt-3">{actions}</div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="group flex gap-3">
        <div className="min-w-0 flex-1">
          <CategoryBadge name={article.category_name} />
          <h3 className="headline mt-1 text-lg">
            <Link href={href} className="line-clamp-3 decoration-1 underline-offset-2 hover:underline">
              {title}
            </Link>
          </h3>
          {summary && <p className="mt-1.5 line-clamp-3 text-[0.92rem] leading-snug text-foreground/80">{summary}</p>}
          <div className="mt-2">
            <Byline article={article} />
          </div>
        </div>
        {article.image_url && (
          <Link href={href} tabIndex={-1} aria-hidden="true" className="mt-5 block w-24 shrink-0 self-start border border-rule/60 p-0.5 sm:w-28">
            <ArticleImage src={article.image_url} alt="" category={article.category_name} width={280} className="aspect-square w-full" />
          </Link>
        )}
      </article>
    );
  }

  return (
    <article className="content-auto group flex h-full flex-col">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block border border-rule/60 p-1">
        <ArticleImage
          src={article.image_url}
          alt=""
          category={article.category_name}
          width={800}
          eager={eagerImage}
          className="aspect-3/2 w-full"
        />
      </Link>
      <div className="mt-3">
        <CategoryBadge name={article.category_name} />
      </div>
      <h3 className="headline mt-1 text-[1.35rem]">
        <Link href={href} className="line-clamp-4 decoration-1 underline-offset-2 hover:underline">
          {title}
        </Link>
      </h3>
      {summary && <p className="news-text mt-2 line-clamp-4 text-[0.95rem] leading-relaxed text-foreground/85">{summary}</p>}
      <div className="mt-3">
        <Byline article={article} />
      </div>
      <div className="mt-auto pt-2">{actions}</div>
    </article>
  );
}

export const ArticleCard = memo(ArticleCardImpl);
