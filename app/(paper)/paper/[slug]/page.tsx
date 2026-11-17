import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaperPage } from '@/components/feed/paper-page';
import type { SearchParams } from '@/lib/feed';
import { getPapers } from '@/lib/data/cached';
import { paperSlug } from '@/lib/routes';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, papers] = await Promise.all([params, getPapers().catch(() => null)]);
  const paper = papers?.find((s) => paperSlug(s.name) === slug.toLowerCase());
  // An unknown (or switched-off) paper: the not-found page, with its title and noindex.
  if (papers && !paper) notFound();
  return { title: paper?.name ?? slug };
}
// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

/** One newspaper: every story it filed lately, newest first, page by page. */
export default async function NewspaperPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <PaperPage list={{ kind: 'paper', slug }} params={query} />;
}
