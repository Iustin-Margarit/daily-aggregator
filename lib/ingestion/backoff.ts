/**
 * A feed that failed this many runs in a row is only tried every RETRY_FAILING_HOURS
 * until it works again (a dead feed would otherwise cost up to 15 s on every run).
 * Its stories stay in the paper; a single-paper "Fetch now" in the Newsroom always tries.
 */
export const FAILING_AFTER = 10;
export const RETRY_FAILING_HOURS = 6;

/** True when a source that keeps failing should sit this run out. */
export function isResting(source: { consecutive_failures: number; last_fetched_at: string | null }, now = Date.now()): boolean {
  if (source.consecutive_failures < FAILING_AFTER || !source.last_fetched_at) return false;
  return now - new Date(source.last_fetched_at).getTime() < RETRY_FAILING_HOURS * 3_600_000;
}
