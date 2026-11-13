import 'server-only';
import { getAutoRefreshMinutes, getRetentionDays } from '@/lib/env';
import { runIngestion } from '@/lib/ingestion/run';
import { createAdminClient } from '@/lib/supabase/admin';

export function canIngest(): boolean {
  return createAdminClient() !== null;
}

/**
 * Refreshes the news in the background when the last run is older than
 * INGESTION_INTERVAL_MINUTES (default 60). Called with `after()` from the feed
 * page, so the app keeps itself up to date even without a cron job.
 */
export async function refreshNewsIfStale(options: { force?: boolean } = {}): Promise<void> {
  const minutes = getAutoRefreshMinutes();
  if (minutes <= 0 && !options.force) return;

  const supabase = createAdminClient();
  if (!supabase) return;

  try {
    const summary = await runIngestion(supabase, {
      trigger: 'auto',
      minIntervalMinutes: options.force ? undefined : minutes,
      retentionDays: getRetentionDays(),
    });
    if (summary.status !== 'skipped') {
      console.info(
        `[ingestion] auto refresh ${summary.status}: ${summary.inserted} new articles from ${summary.sources.length} sources in ${summary.durationMs} ms`,
      );
    }
  } catch (error) {
    console.error('[ingestion] auto refresh failed:', error);
  }
}
