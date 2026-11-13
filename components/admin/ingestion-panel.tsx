'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DownloadCloud } from 'lucide-react';
import { runIngestionNow } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { formatDuration } from '@/lib/format';

export function FetchNewsButton({ sourceId, label = 'Fetch news now', size }: { sourceId?: string; label?: string; size?: 'sm' | 'default' }) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const run = () => {
    setRunning(true);
    startTransition(async () => {
      const result = await runIngestionNow(sourceId);
      setRunning(false);
      if (!result.ok) {
        showToast({ type: 'error', title: 'Fetching failed', message: result.error });
        return;
      }
      const { summary } = result;
      if (summary.status === 'skipped') {
        showToast({ type: 'info', title: 'Already running', message: summary.skippedReason });
      } else {
        const failed = summary.failed.length;
        showToast({
          type: failed ? 'warning' : 'success',
          title: `${summary.inserted} new ${summary.inserted === 1 ? 'article' : 'articles'}`,
          message:
            `Finished in ${formatDuration(summary.durationMs)}.` +
            (failed ? ` ${failed} source${failed === 1 ? '' : 's'} failed: ${summary.failed.map((f) => f.name).join(', ')}.` : ''),
          duration: failed ? 9000 : 5000,
        });
      }
      router.refresh();
    });
  };

  const busy = pending || running;
  return (
    <Button onClick={run} disabled={busy} size={size}>
      {busy ? <Spinner /> : <DownloadCloud />}
      {busy ? 'Fetching…' : label}
    </Button>
  );
}
