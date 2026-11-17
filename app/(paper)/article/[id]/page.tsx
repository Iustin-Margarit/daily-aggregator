import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FrontPageContent } from '@/components/front/front-page';
import { Suspense } from 'react';
import { StandaloneQuickRead } from '@/components/story/quick-read';
import { SheetExtras } from '@/components/story/sheet-extras';
import { getCategoryStyle } from '@/lib/category-styles';
import { getArticle } from '@/lib/data/article';
import { sectionText } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { getSessionUser } from '@/lib/supabase/server';
import { cleanText, truncate } from '@/lib/text';

// The front page underneath may start a background refresh with after().
export const maxDuration = 60;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [article, { t, fmt }] = await Promise.all([getArticle((await params).id), getI18n()]);
  // A story that is gone (or never was): the not-found page, with its title and noindex.
  if (!article) notFound();
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
 * A story's address opened directly (a shared link, a reload, a link from the Newsroom): the front page
 * with the story's quick-read sheet open over it. Pressed inside the paper, the same address opens the
 * sheet over the page the reader is on instead (components/story/quick-read.tsx, QuickReadHost). There is no
 * separate story page: the sheet has everything, and the full story is on the publisher's site.
 */
export default async function StoryPage({ params }: PageProps) {
  const { id } = await params;
  const [article, user] = await Promise.all([getArticle(id), getSessionUser()]);
  if (!article) notFound();

  return (
    <>
      <FrontPageContent />
      <StandaloneQuickRead
        slug={id}
        article={article}
        userId={user?.id ?? null}
        extras={<Suspense fallback={null}><SheetExtras articleId={article.id} categoryName={article.category_name} /></Suspense>}
      />
    </>
  );
}
