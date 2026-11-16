import { QuickRead } from '@/components/story/quick-read';
import { getArticle, getMoreFromDesk } from '@/lib/data/article';
import { getSessionUser } from '@/lib/supabase/server';

/**
 * A story pressed in the paper opens as the quick-read sheet over the page (an intercepted route);
 * its address opened directly prints the front page with the same sheet (app/(paper)/article/[id]).
 */
export default async function QuickReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, user] = await Promise.all([getArticle(id), getSessionUser()]);
  const related = article ? await getMoreFromDesk(article.id) : [];
  return <QuickRead slug={id} article={article} userId={user?.id ?? null} related={related} />;
}
