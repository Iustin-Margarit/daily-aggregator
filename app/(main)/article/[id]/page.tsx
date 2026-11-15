import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ArticleActionsBar } from '@/components/article/article-actions-bar';
import { BackLink } from '@/components/article/back-link';
import { Dateline } from '@/components/article/dateline';
import { RelatedArticles } from '@/components/article/related-articles';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { DropCap } from '@/components/articles/drop-cap';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { Button } from '@/components/ui/button';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatReadingTime } from '@/lib/format';
import { sectionText } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { createClient, getSessionUser } from '@/lib/supabase/server';
import { cleanText, truncate } from '@/lib/text';
import type { ArticleDetail, RelatedArticle } from '@/lib/types';

type PageProps = { params: Promise<{ id: string }> };

const getArticle = cache(async (slugOrId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_article', { p_slug_or_id: decodeURIComponent(slugOrId) }).maybeSingle();
  // The database could not be reached: show "Stop the presses" (app/error.tsx), not a false "not found".
  if (error) throw new Error(`Could not load the story: ${error.message}`);
  return (data as ArticleDetail | null) ?? null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [article, { t, fmt }] = await Promise.all([getArticle((await params).id), getI18n()]);
  if (!article) return { title: t.meta.articleNotFound };
  const title = cleanText(article.title);
  const section = sectionText(t, getCategoryStyle(article.category_name).key, article.category_name).name;
  const description = truncate(cleanText(article.summary), 180) || fmt(t.meta.articleFallback, { section, source: article.source_name });
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      publishedTime: article.published_at,
      images: article.image_url ? [{ url: article.image_url }] : undefined,
    },
    twitter: { card: article.image_url ? 'summary_large_image' : 'summary', title, description },
  };
}

/**
 * One story, set as a broadsheet spread on the same 1360px page as the front
 * page: the headline across the top, then a margin column with the dateline,
 * the story in a reading column of about 72 characters (photograph, summary
 * with an illuminated initial and the way on to the full report), and the
 * story's actions in the right-hand column.
 */
export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const [article, user, { t, fmt, locale }] = await Promise.all([getArticle(id), getSessionUser(), getI18n()]);
  if (!article) notFound();

  const supabase = await createClient();
  const { data: related } = await supabase.rpc('get_related_articles', { p_article_id: article.id, p_limit: 6 });

  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const author = article.author ? cleanText(article.author) : null;
  const readingTime = formatReadingTime(article.reading_minutes, locale);
  const style = getCategoryStyle(article.category_name);
  const section = sectionText(t, style.key, article.category_name).name;

  const source = article.source_website_url ? (
    <a href={article.source_website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
      {article.source_name}
    </a>
  ) : (
    article.source_name
  );

  return (
    <div className="container py-6 sm:py-8">
      <BackLink />

      <article className="card-paper mt-5" data-section={style.key ?? undefined}>
        <header className="px-5 pb-7 pt-8 text-center sm:px-10 sm:pt-10">
          <div className="mb-4">
            <Engraving name={style.engraving} className="h-16 max-w-[9rem] [--engraving-ink:var(--section,var(--engraving-ink))]" />
          </div>
          <CategoryBadge name={article.category_name} />
          <h1 className="headline mx-auto mt-4 max-w-[24ch] text-[2.1rem] sm:text-5xl lg:text-[3.4rem]">{title}</h1>
          <p className="byline mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[0.95rem] text-foreground/80">
            {author && <span>{fmt(t.story.by, { author })}</span>}
            {author && <span aria-hidden="true">·</span>}
            <span>{source}</span>
            {readingTime && <span aria-hidden="true">·</span>}
            {readingTime && <span>{readingTime}</span>}
          </p>
        </header>

        <ScrollDivider className="px-5 sm:px-10" />

        <div className="story-columns px-5 pb-12 pt-7 sm:px-10 lg:pt-9">
          {/* The margin column: when the story was filed, by whom, and for which desk. */}
          <aside className="story-date" aria-label={t.article.dateline}>
            <p className="label mb-1 hidden text-(--brass-ink) lg:block">{t.article.dateline}</p>
            <Dateline publishedAt={article.published_at} />
            <div className="mt-6 hidden space-y-5 border-t border-rule/30 pt-5 lg:block">
              <div>
                <p className="label text-muted-foreground">{t.article.filedBy}</p>
                <p className="mt-1 font-display text-[1.1rem] font-semibold leading-snug">{source}</p>
                {author && <p className="mt-0.5 text-[0.92rem] italic text-muted-foreground">{author}</p>}
              </div>
              <div className="border-t border-rule/30 pt-5">
                <p className="label text-muted-foreground">{t.article.fromDesk}</p>
                <Engraving name={style.engraving} className="mt-3 h-14 max-w-[7rem] [--engraving-ink:var(--section,var(--engraving-ink))]" />
                <p className="mt-2 font-display text-[1.1rem] font-semibold text-(--section)">{section}</p>
              </div>
            </div>
          </aside>

          <div className="story-side">
            <ArticleActionsBar article={article} userId={user?.id ?? null} />
          </div>

          <div className="story-main">
            <figure>
              <div className="photo-plate">
                <ArticleImage src={article.image_url} alt={title} category={article.category_name} width={1600} eager className="aspect-video w-full" />
              </div>
              <figcaption className="mt-2 text-right font-label text-[0.8rem] italic text-muted-foreground">{fmt(t.article.photoVia, { source: article.source_name })}</figcaption>
            </figure>

            {summary ? (
              <DropCap text={summary} className="news-text mt-7 text-[1.2rem] leading-relaxed text-foreground/90" />
            ) : (
              <p className="mt-7 italic text-muted-foreground">{t.article.noSummary}</p>
            )}

            {/* The way on to the full report, set as a ruled notice at the foot of the column. */}
            <div className="mt-9 border-y-[3px] border-double border-rule/45 px-4 py-7 text-center sm:px-8">
              <p className="label text-muted-foreground">{t.article.continues}</p>
              <p className="headline mt-2 text-balance text-2xl">{fmt(t.article.fullReport, { source: article.source_name })}</p>
              <p className="mx-auto mt-2 max-w-md text-pretty text-[0.95rem] text-muted-foreground">{t.article.summaryNote}</p>
              <Button asChild size="lg" className="group/read mt-5">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {t.article.continueReading}
                  <Ornament name="fist" className="fist-poke w-[1.45rem] [--ornament-ink:currentColor]" />
                  <span className="sr-only">{t.article.opensPublisher}</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </article>

      <div className="mt-14">
        <RelatedArticles articles={(related ?? []) as RelatedArticle[]} category={article.category_name} heading={fmt(t.article.moreFromDesk, { section })} />
      </div>
    </div>
  );
}
