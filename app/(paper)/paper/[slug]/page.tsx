import type { Metadata } from 'next';
import { PaperPage } from '@/components/feed/paper-page';
import type { SearchParams } from '@/lib/feed';
import { getPapers } from '@/lib/data/cached';
import { paperSlug } from '@/lib/routes';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, papers] = await Promise.all([params, getPapers().catch(() => [])]);
  return { title: papers.find((s) => paperSlug(s.name) === slug.toLowerCase())?.name ?? slug };
}
// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

/** One newspaper: every story it filed lately, newest first, page by page. */
export default async function NewspaperPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <PaperPage list={{ kind: 'paper', slug }} params={query} />;
}
