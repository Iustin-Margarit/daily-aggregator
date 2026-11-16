import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleSlash, Loader2, XCircle, type LucideIcon } from 'lucide-react';
import { TimeAgo } from '@/components/site/time-ago';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { storyPath } from '@/lib/routes';

export type IngestionRun = {
  id: string;
  trigger: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  started_at: string;
  finished_at: string | null;
  sources_total: number | null;
  sources_failed: number | null;
  articles_inserted: number | null;
  articles_deleted: number | null;
  errors: { source: string | null; error: string }[];
  duration_ms: number | null;
};

export function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail?: React.ReactNode;
  tone?: 'default' | 'warning';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="label text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="mt-2 font-display text-4xl font-bold lining-nums tabular-nums leading-none">
          {typeof value === 'number' ? value.toLocaleString('en-US') : value}
        </p>
        {detail && (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              tone === 'warning' ? 'font-semibold text-amber-800 dark:text-amber-400' : 'italic text-muted-foreground',
            )}
          >
            {tone === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS: Record<IngestionRun['status'], { icon: LucideIcon; label: string; className: string }> = {
  success: { icon: CheckCircle2, label: 'Success', className: 'text-emerald-700 dark:text-emerald-400' },
  partial: { icon: AlertTriangle, label: 'Partial', className: 'text-amber-700 dark:text-amber-400' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-destructive' },
  running: { icon: Loader2, label: 'Running', className: 'text-sky-700 dark:text-sky-400' },
};

export function RunStatus({ status }: { status: IngestionRun['status'] }) {
  const { icon: Icon, label, className } = STATUS[status] ?? STATUS.failed;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', className)}>
      <Icon className={cn('h-4 w-4', status === 'running' && 'animate-spin')} /> {label}
    </span>
  );
}

const TRIGGERS: Record<string, string> = { cron: 'Schedule', admin: 'Admin', auto: 'Automatic', cli: 'Command line' };

export function RecentRuns({ runs }: { runs: IngestionRun[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent ingestion runs</CardTitle>
        <CardDescription>Every run fetches all enabled sources, stores new articles and removes expired ones.</CardDescription>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleSlash className="h-4 w-4" /> No runs yet. Press “Fetch news now”.
          </p>
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="label border-b border-border text-left text-muted-foreground">
                  <th className="px-6 pb-2 font-normal">Status</th>
                  <th className="pb-2 font-normal">Started</th>
                  <th className="pb-2 font-normal">Trigger</th>
                  <th className="pb-2 text-right font-normal">New</th>
                  <th className="pb-2 text-right font-normal">Sources</th>
                  <th className="px-6 pb-2 text-right font-normal">Took</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b align-top last:border-0">
                    <td className="px-6 py-2.5">
                      <RunStatus status={run.status} />
                      {run.errors.length > 0 && (
                        <details className="mt-1 text-xs text-muted-foreground">
                          <summary className="cursor-pointer select-none hover:text-foreground">
                            {run.errors.length} error{run.errors.length === 1 ? '' : 's'}
                          </summary>
                          <ul className="mt-1 space-y-0.5">
                            {run.errors.map((e, i) => (
                              <li key={i}>
                                {e.source && <span className="font-medium text-foreground">{e.source}: </span>}
                                {e.error}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="py-2.5">
                      <TimeAgo date={run.started_at} />
                    </td>
                    <td className="py-2.5 text-muted-foreground">{TRIGGERS[run.trigger] ?? run.trigger}</td>
                    <td className="py-2.5 text-right tabular-nums">{run.articles_inserted ?? '—'}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {run.sources_total == null ? '—' : `${run.sources_total - (run.sources_failed ?? 0)}/${run.sources_total}`}
                    </td>
                    <td className="px-6 py-2.5 text-right tabular-nums text-muted-foreground">{formatDuration(run.duration_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Ranked horizontal bars, one hue, value printed beside each bar. */
export function CategoryBars({ rows }: { rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stories per section</CardTitle>
        <CardDescription>{total.toLocaleString('en-US')} articles currently stored</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm" title={`${row.name}: ${row.count} articles`}>
              <span className="truncate text-muted-foreground">{row.name}</span>
              <span className="h-3 border-b border-border">
                <span
                  className="block h-full bg-foreground/80"
                  style={{ width: `${Math.max(row.count ? 2 : 0, (row.count / max) * 100)}%` }}
                />
              </span>
              <span className="text-right tabular-nums">{row.count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function TopArticles({ rows }: { rows: { title: string; slug: string; saves: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most saved stories</CardTitle>
        <CardDescription>By how many readers saved them</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has saved a story yet.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.slug} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 font-display text-xl font-bold leading-none tabular-nums text-muted-foreground">{index + 1}</span>
                <div className="min-w-0">
                  <Link href={storyPath(row.slug)} className="headline line-clamp-2 text-base hover:underline">
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Saved by {pluralize(row.saves, 'reader')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
