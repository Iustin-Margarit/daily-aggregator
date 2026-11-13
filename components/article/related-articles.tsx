import Link from 'next/link';
import { ArticleImage } from '@/components/articles/article-image';
import { CategoryBadge } from '@/components/articles/category-badge';
import { TimeAgo } from '@/components/site/time-ago';
import { cleanText } from '@/lib/text';
import type { RelatedArticle } from '@/lib/types';

export function RelatedArticles({ articles, category }: { articles: RelatedArticle[]; category: string }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="related-heading">
      <div className="rule-double" />
      <h2 id="related-heading" className="label py-2 text-center text-foreground">
        More from the {category} desk
      </h2>
      <div className="news-grid">
        {articles.map((article) => (
          <div key={article.id}>
            <Link href={`/article/${article.slug}`} className="group block">
              <div className="border border-rule/60 p-1">
                <ArticleImage src={article.image_url} alt="" category={article.category_name} width={700} className="aspect-3/2 w-full" />
              </div>
              <div className="mt-3">
                <CategoryBadge name={article.category_name} />
              </div>
              <h3 className="headline mt-1 line-clamp-3 text-xl group-hover:underline">{cleanText(article.title)}</h3>
              <p className="byline mt-2">
                {article.source_name} · <TimeAgo date={article.published_at} />
              </p>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
