import Link from 'next/link';
import { Logo } from '@/components/site/logo';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';
import { getI18n } from '@/lib/i18n/server';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="paper container flex min-h-screen max-w-2xl flex-col py-8">
      <Logo />
      <div className="flex flex-1 items-center">
        <EmptyState
          className="w-full"
          engraving="kitten-peer"
          title={t.errors.notFound}
          description={t.errors.notFoundNote}
          action={
            <Button asChild>
              <Link href="/">{t.errors.backToFront}</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
