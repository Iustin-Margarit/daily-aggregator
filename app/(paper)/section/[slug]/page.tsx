import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PaperPage } from '@/components/feed/paper-page';
import { getCategoryStyle } from '@/lib/category-styles';
import { getSections } from '@/lib/data/cached';
import { queryWithout, sectionFromSlug, type SearchParams } from '@/lib/feed';
import { sectionText } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { SECTION_PREFIX } from '@/lib/routes';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

function nameFromSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, ' ');
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, { t }, sections] = await Promise.all([params, getI18n(), getSections().catch(() => null)]);
  // An unknown section: the not-found page, with its title and noindex (a real 404 where the status can still change).
  if (sections && !sectionFromSlug(sections, slug)) notFound();
  const name = nameFromSlug(slug);
  return { title: sectionText(t, getCategoryStyle(name).key, name).name };
}
// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

/** One section of the paper, newest first, page by page. */
export default async function SectionPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  // An old /feed?topics=<name> link arrives with its ?topics= still on (next.config.mjs): the address names the section.
  if (query.topics !== undefined) redirect(`${SECTION_PREFIX}${slug}${queryWithout(query, ['topics'])}`);
  return <PaperPage list={{ kind: 'section', slug }} params={query} />;
}
