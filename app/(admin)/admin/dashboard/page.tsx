import type { Metadata } from 'next';
import { Bookmark, FileText, Rss, Users } from 'lucide-react';
import { CategoryBars, RecentRuns, StatTile, TopArticles, type IngestionRun } from '@/components/admin/dashboard-widgets';
import { FetchNewsButton } from '@/components/admin/ingestion-panel';
import { canIngest } from '@/lib/ingestion/auto-refresh';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };
export const maxDuration = 60;

type DashboardStats = {
  users_total: number;
  users_new_7d: number;
  admins_total: number;
  articles_total: number;
  articles_24h: number;
  sources_total: number;
  sources_enabled: number;
  sources_failing: number;
  saves_total: number;
  articles_by_category: { name: string; count: number }[];
  top_articles: { title: string; slug: string; saves: number }[];
  recent_runs: IngestionRun[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  if (error || !data) {
    return <p className="text-sm text-destructive">Could not load statistics: {error?.message}</p>;
  }
  const stats = data as unknown as DashboardStats;
  const ingestionReady = canIngest();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-border pb-4">
        <div>
          <p className="kicker">The newsroom</p>
          <h1 className="headline mt-1 text-4xl">Dashboard</h1>
          <p className="mt-1 italic text-muted-foreground">Health of the wire services and how readers use the paper.</p>
        </div>
        {ingestionReady ? (
          <FetchNewsButton />
        ) : (
          <p className="card-paper max-w-sm px-4 py-2.5 text-sm italic">
            Set SUPABASE_SERVICE_ROLE_KEY on the server to fetch news from here.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label="Readers" value={stats.users_total} detail={`+${stats.users_new_7d} this week · ${stats.admins_total} admin`} />
        <StatTile icon={FileText} label="Stories" value={stats.articles_total} detail={`+${stats.articles_24h} in the last 24 hours`} />
        <StatTile
          icon={Rss}
          label="Wire services"
          value={`${stats.sources_enabled}/${stats.sources_total}`}
          detail={stats.sources_failing > 0 ? `${stats.sources_failing} failing - check Wire services` : 'All enabled sources healthy'}
          tone={stats.sources_failing > 0 ? 'warning' : 'default'}
        />
        <StatTile icon={Bookmark} label="Saved stories" value={stats.saves_total} detail="Clippings kept by all readers" />
      </div>

      <RecentRuns runs={stats.recent_runs} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBars rows={stats.articles_by_category} />
        <TopArticles rows={stats.top_articles} />
      </div>
    </div>
  );
}
