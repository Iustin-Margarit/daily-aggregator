import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ArticleCard } from '@/components/articles/article-card';
import { Button } from '@/components/ui/button';
import { getCategoryStyle } from '@/lib/category-styles';
import { siteConfig } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import type { FeedArticle } from '@/lib/types';

const OFFER = [
  'Only the sections you choose',
  'A “For you” edition that learns',
  'Save stories to read later, with notes',
  'Letters to the editor on every story',
];

// Logged-in visitors are redirected to /feed by the proxy (proxy.ts), so this page is for guests.
export default async function LandingPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const supabase = await createClient();
  const [{ data: latest }, { data: categories }, { count: sourceCount }] = await Promise.all([
    supabase.rpc('get_feed', { p_limit: 11 }),
    supabase.from('categories').select('name').order('sort_order'),
    supabase.from('sources').select('id', { count: 'exact', head: true }).eq('is_enabled', true),
  ]);
  const articles = (latest ?? []) as FeedArticle[];
  const [lead, ...others] = articles;

  return (
    <div className="container py-6">
      <h1 className="sr-only">{siteConfig.masthead}: today’s paper</h1>
      {account === 'deleted' && (
        <p className="paper-box mb-6 px-4 py-3 text-center text-sm italic">Your account has been deleted, along with everything you saved.</p>
      )}

      {lead && (
        <div className="grid gap-8 pb-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-0">
          <div className="lg:pr-8">
            <ArticleCard article={lead} userId={null} variant="lead" eagerImage />
          </div>
          <aside className="space-y-6 lg:border-l lg:border-rule lg:pl-8">
            <div className="paper-box px-5 py-6 text-center">
              <p className="label text-muted-foreground">Make it yours</p>
              <p className="headline mt-2 text-2xl">Get your own edition</p>
              <p className="mt-1 text-sm italic text-muted-foreground">Free, no strings attached. {sourceCount ?? 30}+ publishers, one paper.</p>
              <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-sm">
                {OFFER.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-(--ink-accent)">§</span> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-2">
                <Button asChild>
                  <Link href="/signup">
                    Create a free account <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
            <div>
              <h2 className="label border-b-2 border-rule pb-1.5 text-foreground">In Other News</h2>
              <div className="divide-y divide-border">
                {others.slice(0, 3).map((article) => (
                  <div key={article.id} className="py-4">
                    <ArticleCard article={article} userId={null} variant="compact" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {others.length > 3 && (
        <>
          <div className="rule-thick flex items-center justify-center pb-1 pt-2">
            <span className="label text-foreground">More Headlines</span>
          </div>
          <div className="news-grid">
            {others.slice(3, 9).map((article) => (
              <div key={article.id}>
                <ArticleCard article={article} userId={null} />
              </div>
            ))}
          </div>
        </>
      )}

      <section className="mt-10" aria-labelledby="sections-heading">
        <div className="rule-double" />
        <h2 id="sections-heading" className="label py-2 text-center text-foreground">
          The sections of this paper
        </h2>
        <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).map(({ name }, index) => {
            const style = getCategoryStyle(name);
            const Icon = style.icon;
            return (
              <div
                key={name}
                className="border-b border-border px-4 py-5 text-center sm:nth-[2n]:border-l lg:border-l lg:nth-[4n+1]:border-l-0"
              >
                <p className="label text-[0.6rem] text-muted-foreground">Section {String(index + 1).padStart(2, '0')}</p>
                <Icon className="mx-auto mt-2 h-6 w-6" strokeWidth={1.25} />
                <h3 className="headline mt-2 text-xl">{name}</h3>
                <p className="mt-1 text-sm italic text-muted-foreground">{style.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
