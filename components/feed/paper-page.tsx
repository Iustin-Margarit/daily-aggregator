import Link from 'next/link';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { StoryList } from '@/components/feed/story-list';
import { SearchForm } from '@/components/front/search-form';
import { SectionRibbon, type RibbonPlace } from '@/components/front/section-ribbon';
import { Engraving } from '@/components/site/engraving';
import { PageHeader } from '@/components/site/page-header';
import { getCategoryStyle } from '@/lib/category-styles';
import { getPapers } from '@/lib/data/cached';
import { getReaderContext } from '@/lib/data/reader';
import { feedRpcArgs, firstParam, hasLeadPage, pageFromSearchParams, searchFromParams, sectionFromSlug, type SearchParams } from '@/lib/feed';
import { sectionText } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { refreshNewsIfStale } from '@/lib/ingestion/auto-refresh';
import { safeExternalUrl } from '@/lib/redirect';
import { LATEST_PATH, PAPER_PREFIX, paperSlug, SEARCH_PATH, SECTION_PREFIX, sectionPath } from '@/lib/routes';
import type { FeedArticle, FeedFilters } from '@/lib/types';

export type ListKind = { kind: 'latest' } | { kind: 'section'; slug: string } | { kind: 'paper'; slug: string } | { kind: 'search' };

const linkClass = 'font-medium not-italic text-foreground underline decoration-(--ink-gold) underline-offset-4 hover:decoration-2';

/**
 * One list of the paper, page by page, printed by the server: All the latest (the reader's
 * sections, or every section with ?topics=all), one section (/section/<name>), one newspaper
 * (/paper/<name>) or a search (/search?q=…). A short head of its own (the big nameplate belongs
 * to the front page), the section ribbon, then the stories (components/feed/story-list.tsx).
 */
export async function PaperPage({ list, params }: { list: ListKind; params: SearchParams }) {
  const [i18n, reader] = await Promise.all([getI18n(), getReaderContext()]);
  const { t, fmt, rich, list: listOf } = i18n;
  const { supabase, userId, categories, preferredIds, guestMutes } = reader;
  const names = (ids: string[]) => categories.filter((c) => ids.includes(c.id)).map((c) => sectionText(t, getCategoryStyle(c.name).key, c.name).name);

  let filters: FeedFilters;
  let path: string;
  let query: Record<string, string> = {};
  let place: RibbonPlace = null;
  let head: React.ReactNode;

  if (list.kind === 'section') {
    const category = sectionFromSlug(categories, list.slug);
    // A name the paper does not have (the list did load, so it is not an outage).
    if (!category && reader.loaded) notFound();
    const style = getCategoryStyle(category?.name);
    const text = sectionText(t, style.key, category?.name ?? list.slug);
    const number = categories.findIndex((c) => c.id === category?.id) + 1;
    filters = { categoryIds: category ? [category.id] : [], search: '' };
    path = category ? sectionPath(category.name) : `${SECTION_PREFIX}${list.slug}`;
    place = category ? { kind: 'section', id: category.id } : null;
    head = (
      <header className="flex items-center justify-center gap-5 text-left sm:gap-7" data-section={style.key ?? undefined}>
        <span className="section-stamp block w-[5.5rem] shrink-0 sm:w-[7rem]" aria-hidden="true">
          <span className="stamp flex flex-col items-center">
            <span className="w-full text-center font-label text-[0.62rem] font-semibold tracking-[0.1em] text-(--stamp-ink)">
              {fmt(t.sections.stampNo, { n: String(Math.max(number, 1)).padStart(2, '0') })}
            </span>
            <Engraving name={style.engraving} className="mt-1 h-12 max-w-[4.5rem] sm:h-16 sm:max-w-[5.5rem]" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="kicker">{t.list.sectionKicker}</p>
          <h1 className="headline mt-1 text-[min(2.6rem,11vw)] text-(--section) sm:text-5xl">{text.name}</h1>
          <p className="mt-1.5 text-pretty text-[1rem] italic text-muted-foreground sm:text-[1.05rem]">{text.description}</p>
        </div>
      </header>
    );
  } else if (list.kind === 'paper') {
    // The 30-odd newspapers are few: find this one by the name in its address.
    const sources = await getPapers().catch(() => null);
    const paper = (sources ?? []).find((s) => paperSlug(s.name) === list.slug.toLowerCase());
    if (!paper && sources) notFound();
    const category = categories.find((c) => c.id === paper?.category_id);
    const style = getCategoryStyle(category?.name);
    const section = category ? sectionText(t, style.key, category.name).name : null;
    const site = safeExternalUrl(paper?.website_url ?? null);
    filters = { categoryIds: [], sourceIds: paper ? [paper.id] : [], search: '' };
    path = `${PAPER_PREFIX}${list.slug.toLowerCase()}`;
    head = (
      <PageHeader
        compact
        kicker={t.list.paperKicker}
        title={paper?.name ?? list.slug}
        description={
          <>
            {category && section && (
              <>
                {rich(t.list.paperDesk, {
                  section: (
                    <Link href={sectionPath(category.name)} className={linkClass}>
                      {section}
                    </Link>
                  ),
                })}{' '}
              </>
            )}
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t.list.paperSite}
              </a>
            )}
          </>
        }
      />
    );
  } else if (list.kind === 'latest') {
    // The reader's own sections, unless they asked for every one (?topics=all).
    const every = firstParam(params.topics) === 'all' || preferredIds.length === 0;
    filters = { categoryIds: every ? [] : preferredIds, search: '' };
    path = LATEST_PATH;
    query = every && preferredIds.length > 0 ? { topics: 'all' } : {};
    place = { kind: 'latest' };
    const mine = names(preferredIds);
    head = (
      <PageHeader
        compact
        kicker={t.list.latestKicker}
        title={t.list.latestTitle}
        description={
          preferredIds.length === 0 ? (
            t.feed.everySection
          ) : every ? (
            <>
              {t.feed.everySection}{' '}
              <Link href={LATEST_PATH} className={linkClass}>
                {t.list.onlyMine}
              </Link>
            </>
          ) : (
            <>
              {mine.length <= 3 ? fmt(t.feed.covers, { list: listOf(mine) }) : fmt(t.feed.coversMany, { first: mine[0], second: mine[1], n: mine.length - 2 })}{' '}
              <Link href={`${LATEST_PATH}?topics=all`} className={linkClass}>
                {t.list.everySection}
              </Link>
            </>
          )
        }
      />
    );
  } else {
    const q = searchFromParams(params);
    filters = { categoryIds: [], search: q };
    path = SEARCH_PATH;
    query = q ? { q } : {};
    place = { kind: 'search' };
    head = (
      <>
        <PageHeader compact kicker={t.list.searchKicker} title={t.list.searchTitle} description={q ? fmt(t.feed.searching, { q }) : t.list.searchPrompt} />
        <SearchForm value={q} label={t.toolbar.searchLabel} placeholder={t.toolbar.search} button={t.list.searchButton} />
      </>
    );
  }

  const page = pageFromSearchParams(params);
  // An empty search asks for words first; nothing to look up.
  const nothingToFind = list.kind === 'search' && !filters.search;
  const { data, error } = nothingToFind
    ? { data: [] as FeedArticle[], error: null }
    : await supabase.rpc('get_feed', feedRpcArgs(filters, page, new Date().toISOString(), guestMutes));
  if (error) console.error('[list] could not load the stories:', error.message);
  after(() => refreshNewsIfStale());

  // On the search page the departments stand above the form, so the ribbon's Search ticket (where you are) is
  // not mistaken for the form's own Search button beneath it.
  const searching = list.kind === 'search';
  const ribbon = <SectionRibbon categories={categories} current={place} className={searching ? 'mb-6 sm:mb-8' : 'mt-6 sm:mt-8'} />;

  return (
    <div className="container pt-6 sm:pt-9">
      {searching && ribbon}
      {head}
      {!searching && ribbon}
      {!nothingToFind && (
        <StoryList
          articles={(data ?? []) as FeedArticle[]}
          failed={Boolean(error)}
          page={page}
          lead={hasLeadPage(filters)}
          search={filters.search}
          path={path}
          query={query}
          userId={userId}
          i18n={i18n}
        />
      )}
    </div>
  );
}
