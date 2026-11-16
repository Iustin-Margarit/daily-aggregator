import { FrontPageContent } from '@/components/front/front-page';

// The background refresh started with after() may take a few seconds.
export const maxDuration = 60;

/** The front page, for visitors and readers alike (components/front/front-page.tsx). */
export default async function FrontPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  return <FrontPageContent account={account} />;
}
