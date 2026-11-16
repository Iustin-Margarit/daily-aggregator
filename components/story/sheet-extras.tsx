import { AlsoReportedBy, MoreFromDesk } from '@/components/story/sheet-lists';
import { getAlsoReported, getMoreFromDesk } from '@/lib/data/article';

/**
 * The foot of the quick-read sheet: the same news from other papers, and more from the desk. Streamed
 * (inside a Suspense in the page), so the sheet itself swaps in as soon as the story is known and these
 * two lists fill in a moment later instead of holding the whole sheet back.
 */
export async function SheetExtras({ articleId, categoryName }: { articleId: string; categoryName: string | null }) {
  const [related, alsoReported] = await Promise.all([getMoreFromDesk(articleId), getAlsoReported(articleId)]);
  return (
    <>
      {alsoReported.length > 0 && <AlsoReportedBy stories={alsoReported} />}
      {related.length > 0 && <MoreFromDesk stories={related} categoryName={categoryName} />}
    </>
  );
}
