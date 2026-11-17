'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ornament } from '@/components/site/ornament';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { stayOnCurrentPage } from '@/lib/current-page';
import { LATEST_PATH, paperSlug, SEARCH_PATH, SECTION_PREFIX, sectionPath } from '@/lib/routes';
import type { Category } from '@/lib/types';
import { useScrollPeek } from '@/lib/use-scroll-peek';

/** Which tab of the ribbon is the page the reader is on (a section's id, the latest, a search, one newspaper), if any. */
export type RibbonPlace = { kind: 'latest' } | { kind: 'section'; id: string } | { kind: 'search' } | { kind: 'paper'; slug: string } | null;

/** A newspaper as the Filter ticket lists it. */
export type RibbonPaper = { id: string; name: string; category_id: string };

/**
 * The paper's departments as one band between double rules: All the latest, then
 * every section, each a link to its own page, and set apart at the right end a
 * boxed "Filter" ticket (only some newspapers). The same ribbon on the front page and
 * on every list. Search is in the header bar.
 */
export function SectionRibbon({
  categories,
  papers = [],
  activePapers = [],
  current = null,
  className,
}: {
  categories: Pick<Category, 'id' | 'name'>[];
  papers?: RibbonPaper[];
  /** The newspapers the list is filtered to, by address name (a newspaper's own page: that one). */
  activePapers?: string[];
  current?: RibbonPlace;
  className?: string;
}) {
  const { t } = useI18n();
  // A section's Filter lists only that section's newspapers; the latest, a search and the front page list them all.
  const scoped = current?.kind === 'section' ? papers.filter((p) => p.category_id === current.id) : papers;
  // A filtered list (the latest, a section, a search) hands its newspapers on to the tabs: the latest keeps them all,
  // a section only its own, so a tab never opens on an empty list. A newspaper's own page hands nothing on.
  const carried = current && current.kind !== 'paper' ? activePapers : [];
  const sectionOf = new Map(papers.map((p) => [paperSlug(p.name), p.category_id]));
  const withPapers = (path: string, slugs: string[]) => (slugs.length > 0 ? `${path}?papers=${slugs.join(',')}` : path);
  const latestHref = withPapers(LATEST_PATH, carried);
  return (
    <div className={className}>
      <div className="flex items-stretch gap-2 min-[400px]:gap-3 sm:gap-5">
        {/* The ribbon scrolls sideways whenever the departments do not all fit (styles: .dept-bar). */}
        <DeptBar label={t.toolbar.sections}>
          <Link href={latestHref} className="dept-tab" aria-current={current?.kind === 'latest' ? 'page' : undefined} onClick={(event) => stayOnCurrentPage(event, latestHref)}>
            {t.toolbar.latest}
          </Link>
          {categories.map((category) => {
            const style = getCategoryStyle(category.name);
            const here = current?.kind === 'section' && current.id === category.id;
            const href = withPapers(sectionPath(category.name), carried.filter((slug) => sectionOf.get(slug) === category.id));
            return (
              <Link
                key={category.id}
                href={href}
                className="dept-tab"
                aria-current={here ? 'page' : undefined}
                data-section={style.key ?? undefined}
                onClick={(event) => stayOnCurrentPage(event, href)}
              >
                {sectionText(t, style.key, category.name).name}
              </Link>
            );
          })}
        </DeptBar>
        {/* Search lives in the header bar (components/site/site-header.tsx), so the sections keep the width. */}
        {scoped.length > 0 && <FilterTicket papers={scoped} categories={categories} active={activePapers} />}
      </div>
    </div>
  );
}

/**
 * "Filter": one boxed ticket at the end of the ribbon, with the funnel from A. Pforr's patent drawing (1875), that
 * opens a printed checklist of the newspapers under their section's name (on a section's page: only that section's).
 * The reader ticks any number of them (All and
 * Clear at the top), and Apply at the foot prints the list they are on with only those newspapers (?papers=…; from
 * the front page or a newspaper's own page, the latest): nothing reloads until Apply. With newspapers chosen the
 * ticket is inked in brass and shows how many. Phones print the funnel and the word without the caret (below 360px
 * the funnel and the count only), so the sections keep most of the width.
 * The checklist keeps clear of the header and the phone's bottom bar (collisionPadding) and scrolls inside, with
 * Apply always in view.
 */
function FilterTicket({ papers, categories, active }: { papers: RibbonPaper[]; categories: Pick<Category, 'id' | 'name'>[]; active: string[] }) {
  const { t, plural } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(active));
  // The newspapers under their sections, in the ribbon's order; any without a known section last.
  const known = new Set(categories.map((c) => c.id));
  const groups = [
    ...categories.map((category) => ({ id: category.id, name: category.name, papers: papers.filter((p) => p.category_id === category.id) })),
    { id: 'other', name: null, papers: papers.filter((p) => !known.has(p.category_id)) },
  ].filter((group) => group.papers.length > 0);
  const count = active.length;
  const every = chosen.size === 0 || chosen.size === papers.length;

  const toggle = (slug: string, on: boolean) =>
    setChosen((now) => {
      const next = new Set(now);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });

  /** The list the reader is on (the latest, a section, a search) with only these newspapers; elsewhere the latest. */
  const apply = () => {
    const here = window.location.pathname;
    const isList = here === LATEST_PATH || here === SEARCH_PATH || here.startsWith(SECTION_PREFIX);
    const params = new URLSearchParams(isList ? window.location.search : '');
    params.delete('page');
    params.delete('papers');
    const rest = params.toString();
    // The address names are plain letters, digits and hyphens: joined with bare commas, the address stays readable.
    const papersPart = every ? '' : `papers=${papers.map((p) => paperSlug(p.name)).filter((slug) => chosen.has(slug)).join(',')}`;
    const query = [rest, papersPart].filter(Boolean).join('&');
    router.push(`${isList ? here : LATEST_PATH}${query ? `?${query}` : ''}`);
  };

  const label = count > 0 ? plural(t.toolbar.filterActive, count) : t.toolbar.filterLabel;
  // Radix menus close on a pick; these stay open so several can be ticked.
  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        // Each time it opens, the ticks start from what the page shows.
        if (next) setChosen(new Set(active));
        setOpen(next);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button type="button" className="search-ticket filter-ticket group/filter" data-active={count > 0 ? '' : undefined} aria-label={label} title={label}>
          <Ornament name="funnel" className="h-[1.35rem]" />
          <span className="max-[359px]:sr-only">{t.toolbar.filter}</span>
          {count > 0 && (
            <span className="-ml-0.5 tabular-nums text-(--brass-ink)" aria-hidden="true">
              ({count})
            </span>
          )}
          <span className="text-[0.7rem] leading-none text-(--ink-gold) transition-transform group-data-[state=open]/filter:rotate-180 max-sm:hidden" aria-hidden="true">
            ▾
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={{ top: 72, bottom: 72, left: 8, right: 8 }}
        className="flex max-h-[min(34rem,var(--radix-dropdown-menu-content-available-height))] w-[min(19rem,calc(100vw-1rem))] flex-col p-0"
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-rule/40 py-1 pl-3 pr-1.5">
          <DropdownMenuLabel className="min-w-0 flex-1 truncate px-0">{t.toolbar.filterTitle}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={(event) => { keepOpen(event); setChosen(new Set(papers.map((p) => paperSlug(p.name)))); }} className="shrink-0 px-2 py-1.5 font-label text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-(--brass-ink)">
            {t.toolbar.filterAll}
          </DropdownMenuItem>
          <span className="h-4 w-px bg-rule/45" aria-hidden="true" />
          <DropdownMenuItem onSelect={(event) => { keepOpen(event); setChosen(new Set()); }} className="shrink-0 px-2 py-1.5 font-label text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-(--brass-ink)">
            {t.toolbar.filterClear}
          </DropdownMenuItem>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          {groups.map((group, index) => {
            const style = getCategoryStyle(group.name);
            return (
              <DropdownMenuGroup key={group.id} aria-label={group.name ? sectionText(t, style.key, group.name).name : undefined}>
                {index > 0 && <DropdownMenuSeparator />}
                {group.name && (
                  <p className="px-2.5 pb-0.5 pt-1 font-label text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-(--section)" data-section={style.key ?? undefined} aria-hidden="true">
                    {sectionText(t, style.key, group.name).name}
                  </p>
                )}
                {group.papers.map((paper) => {
                  const slug = paperSlug(paper.name);
                  return (
                    <DropdownMenuCheckboxItem key={paper.id} checked={chosen.has(slug)} onCheckedChange={(on) => toggle(slug, on)} onSelect={keepOpen}>
                      {paper.name}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            );
          })}
        </div>
        <div className="shrink-0 border-t border-rule/40 p-1.5">
          <DropdownMenuItem
            onSelect={apply}
            className="justify-center rounded-[2px] bg-primary py-2.5 font-label text-[0.85rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
          >
            {every ? t.toolbar.filterEvery : plural(t.toolbar.filterApplyCount, chosen.size)}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The department ribbon. When some departments are out of sight it fades on that side; on a phone it also glides
 * a little way along and back when it first comes into view (lib/use-scroll-peek.ts), so readers see it scrolls.
 * The current department is scrolled into view. Pointer and touch readers swipe; keyboard readers tab along.
 */
function DeptBar({ label, children }: { label: string; children: React.ReactNode }) {
  const bar = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  useScrollPeek(bar, 'sections');

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const measure = () =>
      setMore((prev) => {
        const left = el.scrollLeft > 2;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        return prev.left === left && prev.right === right ? prev : { left, right };
      });
    const chosen = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (chosen && (chosen.offsetLeft + chosen.offsetWidth > el.clientWidth || chosen.offsetLeft < el.scrollLeft)) {
      el.scrollLeft = chosen.offsetLeft - el.clientWidth / 2 + chosen.offsetWidth / 2;
    }
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-w-0 flex-1">
      <nav ref={bar} aria-label={label} className="dept-bar" data-more-left={more.left || undefined} data-more-right={more.right || undefined}>
        {children}
      </nav>
    </div>
  );
}
