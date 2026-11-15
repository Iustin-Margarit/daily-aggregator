import Link from 'next/link';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';
import { getI18n } from '@/lib/i18n/server';

export default async function ArticleNotFound() {
  const { t } = await getI18n();
  return (
    <div className="container max-w-2xl py-16">
      <EmptyState
        level={1}
        engraving="kitten-peer"
        title={t.article.pulled}
        description={t.article.pulledNote}
        action={
          <Button asChild>
            <Link href="/feed">{t.article.back}</Link>
          </Button>
        }
      />
    </div>
  );
}
