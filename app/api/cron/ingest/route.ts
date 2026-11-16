import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { STORIES_TAG } from '@/lib/data/cached';
import { NextResponse, type NextRequest } from 'next/server';
import { getRetentionDays } from '@/lib/env';
import { runIngestion } from '@/lib/ingestion/run';
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

  try {
    const summary = await runIngestion(supabase, { trigger: 'cron', retentionDays: getRetentionDays() });
    // New stories: the front page kept between requests is printed again on the next visit.
    revalidateTag(STORIES_TAG, { expire: 0 });
    return NextResponse.json(summary, {
      status: summary.status === 'failed' ? 502 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[ingestion] cron run failed:', error);
    return NextResponse.json({ error: 'Ingestion failed. See the server log for details.' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
