import Link from 'next/link';
import { after } from 'next/server';
import { ArticleCard } from '@/components/articles/article-card';
import { FirstPrinting } from '@/components/front/first-printing';
import { HeadlineList } from '@/components/front/headline-list';
import { NewSince } from '@/components/front/new-since';
import { SectionDigest } from '@/components/front/section-digest';
import { SectionRibbon } from '@/components/front/section-ribbon';
import { WelcomeSlip } from '@/components/front/welcome-slip';
import { MonthAlmanac, OnThisDayCard } from '@/components/site/almanac';
import { EmptyState } from '@/components/site/empty-state';
import { FrontMasthead, StreetBand } from '@/components/site/front-masthead';
import { Ornament } from '@/components/site/ornament';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { SectionHead } from '@/components/site/section-head';
import { getPapers, getPlainFrontPage, ribbonPapers } from '@/lib/data/cached';
import { getReaderContext } from '@/lib/data/reader';
import { hiddenArgs, mutedArgs } from '@/lib/feed';
import { noGuestMutes } from '@/lib/guest';
import { buildFrontPage, FRONT_PAGE_ARGS, type FrontRow } from '@/lib/front-page';
import { getI18n } from '@/lib/i18n/server';
import { canIngest, refreshNewsIfStale } from '@/lib/ingestion/auto-refresh';
import { getOnThisDay } from '@/lib/on-this-day';
import { FRONT_PATH, LATEST_PATH } from '@/lib/routes';
import { siteConfig } from '@/lib/site';
import { pickWelcomePlate } from '@/lib/welcome-plates';

/**
 * The front page, for visitors and readers alike: the nameplate and the section
 * ribbon, the lead story beside the latest headlines, the street, then every
 * section in brief, and the almanac.
 * It is a digest, not a numbered list: the lists are /latest and /section/<name>.
 * Printed at `/`, and under the quick-read sheet when a story's address is opened
 * directly (a shared link, a reload: app/(paper)/article/[id]). The page using it
 * sets `maxDuration = 60` (the background refresh started with after()).
 */
/** Latest dispatches printed beside the lead from 1024px (the rest go under it); keep in step with the nth-child(n+7) below. */
const SIDE_DISPATCHES = 6;

export async function FrontPageContent({ account }: { account?: string }) {
  const [{ t }, reader] = await Promise.all([getI18n(), getReaderContext()]);
  const { supabase, userId, categories, guestMutes } = reader;
  const onThisDayPromise = getOnThisDay(new Date());
  // A visitor without mutes sees what every such visitor sees: kept between
  // requests (lib/data/cached.ts). An account (hidden stories, its own mutes) or a visitor's mutes: read live.
  const plain = !userId && noGuestMutes(guestMutes);
  const live = () =>
    supabase.rpc('get_front_page', { ...FRONT_PAGE_ARGS, ...mutedArgs(guestMutes), ...hiddenArgs(guestMutes) });
  const storiesPromise = plain
    ? getPlainFrontPage()
        .then((data) => ({ data, error: null }))
        .catch(live)
    : live();
  const [{ data: rows, error }, papers, onThisDay] = await Promise.all([storiesPromise, getPapers().catch(() => null), onThisDayPromise]);
  if (error) console.error('[front] could not load the stories:', error.message);
  const { lead, dispatches, digests } = buildFrontPage((rows ?? []) as FrontRow[], categories);

  // A brand-new install has no stories yet: fetch them now (and every visit refreshes stale feeds).
  let databaseEmpty = false;
  if (!error && !lead) {
    const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true });
    databaseEmpty = !count;
  }
  const autoIngest = canIngest();
  after(() => refreshNewsIfStale({ force: databaseEmpty && autoIngest }));

  return (
    <div className="container pt-3 sm:pt-4">
      <h1 className="sr-only">
        <span lang="en">{siteConfig.masthead}</span>: {t.masthead.todaysPaper}
      </h1>
      {account === 'deleted' && <p className="card-paper mb-5 px-5 py-3 text-center text-[0.95rem]">{t.landing.deleted}</p>}

      <FrontMasthead home={FRONT_PATH} />
      <SectionRibbon categories={categories} papers={ribbonPapers(papers)} className="mt-3" />

      {error && !lead ? (
        <EmptyState level={2} engraving="press" title={t.feed.jammed} description={t.feed.jammedNote} className="mt-8" />
      ) : databaseEmpty && autoIngest ? (
        <FirstPrinting />
      ) : databaseEmpty ? (
        <EmptyState level={2} engraving="press" title={t.feed.notPrinted} description={t.front.notPrintedShort} className="mt-8" />
      ) : null}

      {lead && (
        // The lead story beside the newest headlines, divided by a column rule. From 1024px the lead's photograph is
        // kept short (the summary beside it), so the last dispatches move under the lead in two columns ("More
        // dispatches") and both columns end together; on phones and tablets they stay one list under the lead.
        <div className="mt-4 grid grid-cols-1 gap-8 sm:mt-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-0">
          <div className="flex lg:col-start-1 lg:row-start-1 lg:pr-9">
            <ArticleCard article={lead} userId={userId} variant="lead" eagerImage topStory />
          </div>
          {dispatches.length > SIDE_DISPATCHES && (
            <section className="hidden lg:col-start-1 lg:row-start-2 lg:block lg:pr-9 lg:pt-8" aria-labelledby="more-dispatches">
              <SectionHead id="more-dispatches" engraving="telegraph">
                {t.front.moreDispatches}
              </SectionHead>
              <div className="mt-3 grid grid-cols-2 gap-x-8">
                {[0, 1].map((column) => (
                  <HeadlineList
                    key={column}
                    articles={dispatches.slice(SIDE_DISPATCHES).filter((_, index) => index % 2 === column)}
                    withSection
                    thumbnails
                  />
                ))}
              </div>
            </section>
          )}
          <aside className="flex flex-col border-t border-rule/40 pt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0" aria-labelledby="dispatches">
            <SectionHead id="dispatches" engraving="telegraph">
              {t.landing.latest}
            </SectionHead>
            {/* "12 new stories since your last visit this morning." (from the second visit in this browser). */}
            <NewSince signedIn={Boolean(userId)} className="mt-1.5 text-center" />
            {/* From 1024px only the first few here; the rest are printed under the lead (above). */}
            <HeadlineList articles={dispatches} withSection thumbnails className="mt-3 lg:[&>li:nth-child(n+7)]:hidden" />
            <Link
              href={LATEST_PATH}
              className="group/read mt-4 inline-flex items-center gap-2.5 self-start border-t-[3px] border-double border-rule/40 pt-3 font-display text-[1.05rem] font-semibold text-(--brass-ink) hover:text-foreground"
            >
              {t.front.allLatest}
              <Ornament name="fist" className="fist-poke h-[1rem] [--ornament-ink:currentColor]" />
            </Link>
          </aside>
        </div>
      )}

      {/* Visitors on their first visits: what this paper is (kept in the browser, never for readers with an account). */}
      {!userId && lead && <WelcomeSlip plate={pickWelcomePlate()} papers={papers?.length || 30} />}

      <StreetBand className="mt-10 sm:mt-12" />

      {digests.length > 0 && (
        <section className="mt-8 sm:mt-9" aria-labelledby="sections-heading">
          <SectionHead id="sections-heading" className="text-[1.35rem]">
            {t.front.sectionsTitle}
          </SectionHead>
          <p className="mt-1 text-balance text-center italic text-muted-foreground">{t.front.sectionsNote}</p>
          <div className="digest-grid mt-7">
            {digests.map((digest) => (
              <SectionDigest
                key={digest.category.id}
                digest={digest}
                number={categories.findIndex((c) => c.id === digest.category.id) + 1}
                userId={userId}
              />
            ))}
          </div>
        </section>
      )}

      <ScrollDivider className="mt-12" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <MonthAlmanac wide />
        {onThisDay && <OnThisDayCard data={onThisDay} />}
      </div>
    </div>
  );
}
