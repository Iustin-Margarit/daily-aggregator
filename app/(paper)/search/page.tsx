import type { Metadata } from 'next';
import { PaperPage } from '@/components/feed/paper-page';
import { searchFromParams, type SearchParams } from '@/lib/feed';
import { getI18n } from '@/lib/i18n/server';

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [params, { t, fmt }] = await Promise.all([searchParams, getI18n()]);
  const q = searchFromParams(params);
  return { title: q ? fmt(t.meta.search, { q }) : t.list.searchTitle };
}
// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

/** Search the paper's headlines: the form, and with ?q=… the stories that match, page by page. */
export default async function SearchPage({ searchParams }: Props) {
  return <PaperPage list={{ kind: 'search' }} params={await searchParams} />;
}
