import Link from 'next/link';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { SectionHead } from '@/components/site/section-head';
import { TimeAgo } from '@/components/site/time-ago';
import { getCategoryStyle } from '@/lib/category-styles';
import { cleanText } from '@/lib/text';
import type { RelatedArticle } from '@/lib/types';

/** More stories from the same desk, set in columns like the front page (the grid draws the rules). */
export function RelatedArticles({ articles, category }: { articles: RelatedArticle[]; category: string }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="related-heading">
      <ScrollDivider className="mb-6" />
      <SectionHead id="related-heading" engraving={getCategoryStyle(category).engraving} className="mb-7 text-[1.3rem]">
        More from the {category} desk
      </SectionHead>
      <div className="news-grid">
        {articles.map((article) => (
          <div key={article.id}>
            <article className="group flex h-full w-full flex-col" data-section={getCategoryStyle(article.category_name).key ?? undefined}>
              <Link href={`/article/${article.slug}`} tabIndex={-1} aria-hidden="true" className="photo-plate">
                <ArticleImage src={article.image_url} alt="" category={article.category_name} width={700} className="aspect-[16/10] w-full" />
              </Link>
              <div className="pt-4">
                <CategoryBadge name={article.category_name} />
                <h3 className="headline mt-2.5 text-[1.25rem]">
                  <Link href={`/article/${article.slug}`} className="line-clamp-3 decoration-1 underline-offset-2 hover:underline">
                    {cleanText(article.title)}
                  </Link>
                </h3>
                <p className="byline mt-2">
                  <span className="font-medium text-foreground/80">{article.source_name}</span> · <TimeAgo date={article.published_at} />
                </p>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
