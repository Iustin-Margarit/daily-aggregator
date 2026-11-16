import type { Metadata } from 'next';
import { PaperPage } from '@/components/feed/paper-page';
import type { SearchParams } from '@/lib/feed';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.list.latestTitle };
}
// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

/** Every story from the reader's sections (or every section), newest first, page by page. */
export default async function LatestPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <PaperPage list={{ kind: 'latest' }} params={await searchParams} />;
}
