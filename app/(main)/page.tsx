import Link from 'next/link';
import { ArticleCard } from '@/components/articles/article-card';
import { MonthAlmanac } from '@/components/site/almanac';
import { Engraving } from '@/components/site/engraving';
import { FrontMasthead } from '@/components/site/front-masthead';
import { Ornament } from '@/components/site/ornament';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { SectionHead } from '@/components/site/section-head';
import { Button } from '@/components/ui/button';
import { getCategoryStyle } from '@/lib/category-styles';
import { siteConfig } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import type { FeedArticle } from '@/lib/types';

const OFFER = [
  'Only the sections you choose, from postage stamps',
  'Clip stories to read later, in folders with your own notes',
  'Print a clipping, or save it as a PDF',
  'A morning and a night edition, larger print and other comforts',
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
    <div className="container pt-5 sm:pt-6">
      <h1 className="sr-only">{siteConfig.masthead}: today’s paper</h1>
      {account === 'deleted' && (
        <p className="card-paper mb-5 px-5 py-3 text-center text-[0.95rem]">Your account has been deleted, along with everything you saved.</p>
      )}

      <FrontMasthead home="/" />
      <ScrollDivider className="mt-6" />

      {/* Welcome: what this paper is, with Edward Penfield's reader of 1897. */}
      <section className="card-paper mt-6 grid items-center gap-8 overflow-hidden p-6 sm:p-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 lg:p-10">
        <figure className="mx-auto w-full max-w-xs md:max-w-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
          <img
            src="/plates/reader.webp"
            alt="A woman in a straw hat reading the paper in a green rocking chair"
            width={717}
            height={1000}
            className="w-full rounded-2xl shadow-lift"
          />
          <figcaption className="mt-2 text-center font-label text-[0.78rem] text-muted-foreground">After Edward Penfield, 1897</figcaption>
        </figure>
        <div>
          <p className="kicker">Free, and no account needed</p>
          <h2 className="headline mt-2 text-[2.1rem] sm:text-5xl">Your own morning paper</h2>
          <p className="mt-4 max-w-xl text-[1.08rem] leading-relaxed text-foreground/85">
            {sourceCount ?? 30}+ newspapers, printed as one. Pick the sections you care about and read them like a real paper, with
            none of the noise.
          </p>
          <ul className="mt-5 space-y-2.5">
            {OFFER.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[1.02rem]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[0.95rem] text-(--ink-gold)" aria-hidden="true">
                  ✦
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="group/read">
              <Link href="/feed">
                Read today’s paper
                <Ornament name="fist" className="fist-poke w-[1.45rem] [--ornament-ink:currentColor]" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/onboarding">Choose my sections</Link>
            </Button>
          </div>
          <p className="mt-4 text-[0.95rem] italic text-muted-foreground">
            Read, search and clip without signing up; your clippings stay in this browser.{' '}
            <Link href="/signup" className="font-medium not-italic text-foreground underline decoration-(--ink-gold) underline-offset-4 hover:decoration-2">
              A free account
            </Link>{' '}
            keeps them on every device.
          </p>
        </div>
      </section>

      {lead && (
        <>
          <ScrollDivider className="mt-12" />
          <SectionHead className="mb-6 mt-6 text-[1.35rem]">Today’s top story</SectionHead>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-0">
            <div className="flex lg:pr-9">
              <ArticleCard article={lead} userId={null} variant="lead" eagerImage />
            </div>
            <aside className="flex flex-col border-t border-rule/40 pt-6 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0" aria-labelledby="other-news">
              <SectionHead id="other-news" engraving="telegraph">
                In other news
              </SectionHead>
              <div className="mt-2 divide-y divide-rule/30">
                {others.slice(0, 4).map((article) => (
                  <div key={article.id} className="py-4 last:pb-0">
                    <ArticleCard article={article} userId={null} variant="compact" />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}

      {others.length > 4 && (
        <>
          <ScrollDivider className="mt-12" />
          <SectionHead engraving="press" className="mb-7 mt-6 text-[1.35rem]">
            Latest dispatches
          </SectionHead>
          <div className="news-grid">
            {/* Wrapped: the grid draws its column rules on its children, and a story card clips its own paint. */}
            {others.slice(4, 10).map((article) => (
              <div key={article.id}>
                <ArticleCard article={article} userId={null} />
              </div>
            ))}
          </div>
        </>
      )}

      <MonthAlmanac wide className="mt-8" />

      <section className="mt-14" aria-labelledby="sections-heading">
        <SectionHead id="sections-heading" className="text-[1.35rem]">
          The sections of this paper
        </SectionHead>
        <p className="mt-1 text-center italic text-muted-foreground">Press a stamp to make it part of your paper. Change your mind whenever you like.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {(categories ?? []).map(({ name }, index) => {
            const style = getCategoryStyle(name);
            return (
              // Each stamp opens the Sections page, where pressing it adds it to the reader's paper.
              <Link key={name} href="/onboarding" className="section-stamp block" data-section={style.key ?? undefined} aria-label={`Choose ${name} for your paper`}>
                <div className="stamp flex h-full flex-col items-center text-center">
                  <div className="flex w-full items-center justify-between font-label text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-(--section)">
                    <span>No. {String(index + 1).padStart(2, '0')}</span>
                    <span>Daily</span>
                  </div>
                  <Engraving name={style.engraving} className="mt-3 h-20 max-w-[7.5rem]" />
                  <h3 className="headline mt-3 text-xl text-(--section)">{name}</h3>
                  <p className="mt-1 text-[0.9rem] leading-snug text-muted-foreground">{style.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
