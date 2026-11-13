/**
 * Fetches every enabled RSS source once and stores new articles.
 *
 *   npm run ingest
 */
import './load-env';
import { runIngestion } from '../lib/ingestion/run';
import { createServiceClient } from './service-client';

async function main() {
  const supabase = createServiceClient();
  const retentionDays = Number.parseInt(process.env.ARTICLE_RETENTION_DAYS ?? '', 10) || 30;

  console.log('Fetching news…');
  const summary = await runIngestion(supabase, {
    trigger: 'cli',
    retentionDays,
    log: (message) => console.log(message),
  });

  if (summary.status === 'skipped') {
    console.log(`Skipped: ${summary.skippedReason}`);
    return;
  }

  const failed = summary.sources.filter((s) => !s.ok);
  console.log(
    `\n${summary.status.toUpperCase()}: ${summary.inserted} new articles from ${summary.sources.length - failed.length}/${summary.sources.length} sources` +
      ` in ${(summary.durationMs / 1000).toFixed(1)} s` +
      (summary.deleted ? `, ${summary.deleted} old articles removed` : ''),
  );
  if (failed.length > 0) process.exitCode = summary.status === 'failed' ? 1 : 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
