import { NextResponse } from 'next/server';
import { getAlsoReported, getArticle, getMoreFromDesk } from '@/lib/data/article';

/**
 * A story for the quick-read sheet (lib/story-cache.ts, loadStoryDetail): the server's copy (with the reader's
 * own Saved mark) and the two lists at the sheet's foot, which leave out the reader's muted papers and words.
 * Per reader, so never cached; 404 when the story is gone.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug || slug.length > 300) return NextResponse.json({ error: 'not found' }, { status: 404 });
  try {
    const article = await getArticle(slug);
    if (!article) return NextResponse.json({ error: 'not found' }, { status: 404, headers: { 'cache-control': 'private, no-store' } });
    const [related, alsoReported] = await Promise.all([getMoreFromDesk(article.id), getAlsoReported(article.id)]);
    return NextResponse.json({ article, related, alsoReported }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    console.error('[story api]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store' } });
  }
}
