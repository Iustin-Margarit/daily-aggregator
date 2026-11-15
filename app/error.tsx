'use client';

import { useEffect } from 'react';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // The whole page in its place (this boundary sits above the reader's layout), so it is the main landmark.
    <main id="main" className="container max-w-2xl py-16">
      <EmptyState
        level={1}
        engraving="press"
        title={t.errors.stopPresses}
        description={t.errors.stopPressesNote}
        action={
          <>
            <Button onClick={reset}>{t.common.tryAgain}</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              {t.errors.frontPage}
            </Button>
          </>
        }
      />
    </main>
  );
}
