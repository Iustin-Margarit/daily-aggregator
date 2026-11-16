'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n/client';

/**
 * A brand-new install with no stories yet: the first fetch runs on the server
 * (after() in the page), so this notice asks for the page again every few
 * seconds, about two minutes at most, until the stories are in.
 */
export function FirstPrinting() {
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 30) window.clearInterval(timer);
      else router.refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [router]);
  return (
    <div className="card-paper mt-8 flex items-center gap-4 p-5" role="status">
      <Spinner className="h-5 w-5" />
      <div>
        <p className="font-display text-lg font-semibold">{t.feed.running}</p>
        <p className="text-sm italic text-muted-foreground">{t.feed.runningNote}</p>
      </div>
    </div>
  );
}
