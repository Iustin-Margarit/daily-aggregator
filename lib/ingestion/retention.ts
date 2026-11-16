/**
 * How many days of news to keep, given the size of the database.
 *
 * The free Supabase plan holds 500 MB. Over SOFT_LIMIT the run keeps SHORT_RETENTION_DAYS instead of the
 * usual 30 (never more than the configured days); under it, the usual days again. Saved stories are
 * always kept by the cleanup itself (cleanup_old_articles).
 */

const MB = 1024 * 1024;

export const DATABASE_LIMIT_BYTES = 500 * MB;
export const DATABASE_SOFT_LIMIT_BYTES = 300 * MB;
export const SHORT_RETENTION_DAYS = 14;

export type Retention = {
  days: number;
  /** The database is over the soft limit, so the days were cut short. */
  shortened: boolean;
};

export function effectiveRetention(configuredDays: number, databaseBytes: number | null): Retention {
  if (databaseBytes !== null && databaseBytes > DATABASE_SOFT_LIMIT_BYTES && configuredDays > SHORT_RETENTION_DAYS) {
    return { days: SHORT_RETENTION_DAYS, shortened: true };
  }
  return { days: configuredDays, shortened: false };
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
