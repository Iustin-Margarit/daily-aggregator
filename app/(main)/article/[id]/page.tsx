import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ArticleActionsBar } from '@/components/article/article-actions-bar';
import { BackLink } from '@/components/article/back-link';
import { Comments } from '@/components/article/comments';
import { RelatedArticles } from '@/components/article/related-articles';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { createClient, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import { cleanText, truncate } from '@/lib/text';
import type { ArticleDetail, CommentItem, RelatedArticle } from '@/lib/types';

type PageProps = { params: Promise<{ id: string }> };

const getArticle = cache(async (slugOrId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_article', { p_slug_or_id: decodeURIComponent(slugOrId) }).maybeSingle();
  return (data as ArticleDetail | null) ?? null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticle((await params).id);
  if (!article) return { title: 'Article not found' };
  const title = cleanText(article.title);
  const description = truncate(cleanText(article.summary), 180) || `${article.category_name} news from ${article.source_name}`;
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

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const [article, user, profile] = await Promise.all([getArticle(id), getCurrentUser(), getCurrentProfile()]);
  if (!article) notFound();

  const supabase = await createClient();
  const [{ data: related }, { data: comments }] = await Promise.all([
    supabase.rpc('get_related_articles', { p_article_id: article.id, p_limit: 6 }),
    supabase.rpc('get_article_comments', { p_article_id: article.id }),
  ]);

  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const author = article.author ? cleanText(article.author) : null;
  const articlePath = `/article/${article.slug}`;

  return (
    <div className="container max-w-5xl py-6 sm:py-8">
      <BackLink />

      <article className="mt-6">
        <header className="text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-rule" aria-hidden="true" />
            <CategoryBadge name={article.category_name} />
            <span className="h-px w-10 bg-rule" aria-hidden="true" />
          </div>
          <h1 className="headline mx-auto mt-4 max-w-4xl text-[2.2rem] sm:text-5xl lg:text-[3.6rem]">{title}</h1>
          <div className="mt-6 border-y border-rule py-2">
            <p className="byline flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-foreground/80">
              {author && <span>By {author}</span>}
              {author && <span aria-hidden="true">|</span>}
              {article.source_website_url ? (
                <a href={article.source_website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {article.source_name}
                </a>
              ) : (
                <span>{article.source_name}</span>
              )}
              <span aria-hidden="true">|</span>
              <time dateTime={article.published_at}>{formatDateTime(article.published_at)}</time>
              <span aria-hidden="true">|</span>
              <TimeAgo date={article.published_at} />
            </p>
          </div>
        </header>

        <figure className="mt-6">
          <div className="border border-rule p-2">
            <ArticleImage src={article.image_url} alt={title} category={article.category_name} width={1600} eager className="aspect-video w-full" />
          </div>
          <figcaption className="mt-1.5 text-right text-xs italic text-muted-foreground">Photograph via {article.source_name}</figcaption>
        </figure>

        <div className="mx-auto mt-8 max-w-3xl">
          <ArticleActionsBar article={article} userId={user?.id ?? null} />

          {summary ? (
            <p className="news-text dropcap mt-6 text-[1.2rem] leading-relaxed text-foreground/90">{summary}</p>
          ) : (
            <p className="mt-6 italic text-muted-foreground">The publisher did not include a summary for this story.</p>
          )}

          <div className="paper-box mt-8 px-6 py-7 text-center">
            <p className="label text-muted-foreground">The story continues</p>
            <p className="headline mt-2 text-2xl">Read the full report at {article.source_name}</p>
            <p className="mx-auto mt-2 max-w-md text-sm italic text-muted-foreground">
              You are reading a summary. The complete article, with all its reporting, is on the publisher’s website.
            </p>
            <Button asChild size="lg" className="mt-5">
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                Continue reading <ExternalLink />
              </a>
            </Button>
          </div>
        </div>
      </article>

      <div className="mx-auto mt-12 max-w-3xl">
        <Comments
          articleId={article.id}
          articlePath={articlePath}
          initialComments={(comments ?? []) as CommentItem[]}
          viewer={user && profile ? { id: user.id, username: profile.username, avatarColor: profile.avatar_color } : null}
        />
      </div>

      <div className="mt-14">
        <RelatedArticles articles={(related ?? []) as RelatedArticle[]} category={article.category_name} />
      </div>
    </div>
  );
}
