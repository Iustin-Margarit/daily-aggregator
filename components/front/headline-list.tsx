'use client';

import Link from 'next/link';
import { ArticleImage } from '@/components/articles/article-image';
import { TimeAgo } from '@/components/site/time-ago';
import { StoryLink } from '@/components/story/story-link';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { paperPath } from '@/lib/routes';
import { cleanText } from '@/lib/text';
import type { FeedArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Headlines one under another, each on a ruled line with its paper and age
 * under it: the quickest way to see what is new (Latest dispatches, and the
 * lines under each section's photograph). `withSection` prints the section's
 * name in its ink first, for lists that mix sections. `thumbnails` sets a small
 * photo plate at the left of each line (Latest dispatches): every plate is the
 * same 4:3 size, so the lines stay even, and a story without a usable photo
 * gets its section's engraving instead (ArticleImage), never a broken image.
 */
export function HeadlineList({
  articles,
  withSection = false,
  thumbnails = false,
  className,
}: {
  articles: FeedArticle[];
  withSection?: boolean;
  thumbnails?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <ul className={cn('divide-y divide-rule/30', className)}>
      {articles.map((article) => {
        const style = getCategoryStyle(article.category_name);
        return (
          <li key={article.id} className={cn('first:pt-0 last:pb-0', thumbnails ? 'py-3' : 'py-2.5')} data-section={style.key ?? undefined}>
            {/* An <article>, so pointing at the line clears its photo to full colour like every other story (.photo-plate). */}
            <article className={cn(thumbnails && 'flex items-start gap-3.5')}>
              {thumbnails && (
                <StoryLink article={article} tabIndex={-1} aria-hidden="true" className="photo-plate plate-thumb w-[6.5rem] shrink-0 sm:w-[7rem]">
                  <ArticleImage src={article.image_url} alt="" category={article.category_name} width={320} sizes="7rem" className="aspect-[4/3] w-full" />
                </StoryLink>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[1.04rem] font-semibold leading-snug text-balance">
                  <StoryLink article={article} className={cn('decoration-1 underline-offset-2 hover:underline', thumbnails ? 'line-clamp-3' : 'line-clamp-2')}>
                    {cleanText(article.title)}
                  </StoryLink>
                </h3>
                <p className="byline mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5">
                  {withSection && (
                    <>
                      <span className="font-label text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-(--section)">
                        {sectionText(t, style.key, article.category_name).name}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <Link href={paperPath(article.source_name)} className="truncate font-medium text-foreground/80 underline-offset-2 hover:underline">
                    {article.source_name}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <TimeAgo date={article.published_at} />
                </p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
