import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { STORIES_TAG } from '@/lib/data/cached';
import { after, NextResponse, type NextRequest } from 'next/server';
import { getRetentionDays } from '@/lib/env';
import { claimIngestionRun, runIngestion, skippedRun } from '@/lib/ingestion/run';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest, secret: string): boolean {
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Scheduled news ingestion. Call with `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron does this automatically when CRON_SECRET is set).
 *
 * A run can last 45 s, but cron-job.org gives up on a request after 30 s. So the lock is taken first
 * and the call is answered at once (202 `started`, or 200 `skipped` when a run is already going);
 * the run itself finishes after the response (`after`, inside maxDuration) and is logged in
 * ingestion_runs, which the Newsroom shows. `?wait=1` answers when the run ends, with its summary.
 */
async function handler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on the server.' }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, { status: 503 });
  }

  const options = { trigger: 'cron' as const, retentionDays: getRetentionDays() };
  const wait = request.nextUrl.searchParams.get('wait') === '1';
  const noStore = { 'Cache-Control': 'no-store' };

  try {
    const claimedRunId = await claimIngestionRun(supabase, options);
    if (!claimedRunId) return NextResponse.json(skippedRun(options), { headers: noStore });

    const run = async () => {
      const summary = await runIngestion(supabase, { ...options, claimedRunId });
      // New stories: the front page kept between requests is printed again on the next visit.
      revalidateTag(STORIES_TAG, { expire: 0 });
      return summary;
    };

    if (wait) {
      const summary = await run();
      return NextResponse.json(summary, { status: summary.status === 'failed' ? 502 : 200, headers: noStore });
    }
    after(async () => {
      try {
        await run();
      } catch (error) {
        console.error('[ingestion] cron run failed:', error);
      }
    });
    return NextResponse.json({ status: 'started', runId: claimedRunId }, { status: 202, headers: noStore });
  } catch (error) {
    console.error('[ingestion] cron run failed:', error);
    return NextResponse.json({ error: 'Ingestion failed. See the server log for details.' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
