import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/page-header';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { Engraving } from '@/components/site/engraving';
import { getPapers, getSections } from '@/lib/data/cached';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { sectionPath } from '@/lib/routes';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.sections };
}

/**
 * The paper's sections as eight postage stamps, centred: pressing a stamp opens that section's list.
 * The same for every reader (the front page always prints every section), so it is read from the
 * lists kept between requests (lib/data/cached.ts).
 */
export default async function SectionsPage() {
  const [{ t, fmt, plural }, categories, papers] = await Promise.all([
    getI18n(),
    getSections().catch(() => []),
    getPapers().catch(() => []),
  ]);
  const w = t.sectionsPage;

  const paperCounts: Record<string, number> = {};
  for (const paper of papers) paperCounts[paper.category_id] = (paperCounts[paper.category_id] ?? 0) + 1;

  return (
    // Phones: a short header, so the first row of stamps shows without scrolling.
    <div className="container pb-8 pt-4 sm:py-10">
      <PageHeader title={w.title} description={w.description} compact />
      <ScrollDivider className="my-2 sm:my-8 max-sm:[&_.ornament-mask]:w-[7.5rem]" />
      <nav aria-label={w.title} className="mx-auto max-w-[68rem]">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {categories.map((category, index) => {
            const style = getCategoryStyle(category.name);
            const section = sectionText(t, style.key, category.name);
            const count = paperCounts[category.id] ?? 0;
            return (
              <li key={category.id} className="flex">
                <Link
                  href={sectionPath(category.name)}
                  data-section={style.key ?? undefined}
                  className="section-stamp relative block w-full rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  {/* A container: the section's name shrinks to the stamp's width ("Entertainment" on a phone). */}
                  <span className="stamp @container flex h-full flex-col items-center gap-2.5 text-center">
                    <span className="w-full text-left font-label text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-(--stamp-ink)">
                      {fmt(t.sections.stampNo, { n: String(index + 1).padStart(2, '0') })}
                    </span>
                    <Engraving name={style.engraving} className="mx-auto h-16 max-w-[min(7rem,100%)]" />
                    <span className="w-full min-w-0 px-1">
                      {/* Sized to the stamp (11.5% of its width): "Entertainment" keeps clear of the inner rule on a
                          320px phone. If a phone's own text size makes it larger still, it breaks with a hyphen. */}
                      <span className="headline block text-[min(1.2rem,11.5cqi)] text-(--stamp-ink) [overflow-wrap:anywhere] hyphens-auto">{section.name}</span>
                      {/* A very narrow stamp (a 280px phone) keeps only the name: the line would break inside its words. */}
                      <span className="mt-1 block break-words text-[0.9rem] leading-snug text-muted-foreground @max-[8.5rem]:hidden">{section.description}</span>
                    </span>
                    {count > 0 && <span className="byline mt-auto">{plural(w.newspapers, count)}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
