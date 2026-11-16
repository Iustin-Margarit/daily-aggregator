import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PaperPage } from '@/components/feed/paper-page';
import { getCategoryStyle } from '@/lib/category-styles';
import { queryWithout, type SearchParams } from '@/lib/feed';
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
  const [{ slug }, { t }] = await Promise.all([params, getI18n()]);
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
