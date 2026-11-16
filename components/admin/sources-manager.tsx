'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  DownloadCloud,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { runIngestionNow } from '@/app/actions/admin';
import { FetchNewsButton } from '@/components/admin/ingestion-panel';
import { SourceDialog, type SourceDraft } from '@/components/admin/source-dialog';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { FAILING_AFTER, RETRY_FAILING_HOURS } from '@/lib/ingestion/backoff';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

export type AdminSource = {
  id: string;
  name: string;
  rss_url: string;
  website_url: string | null;
  description: string | null;
  category_id: string;
  category_name: string;
  is_enabled: boolean;
  last_fetched_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  last_item_count: number | null;
  article_count: number;
  latest_article_at: string | null;
};

function Health({ source }: { source: AdminSource }) {
  if (!source.last_fetched_at) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <CircleDashed className="h-4 w-4" /> Not fetched yet
      </span>
    );
  }
  if (source.consecutive_failures > 0) {
    return (
      <span className="inline-flex items-start gap-1.5 text-amber-700 dark:text-amber-400" title={source.last_error ?? undefined}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Failing ×{source.consecutive_failures}
          {source.consecutive_failures >= FAILING_AFTER && ` · retried every ${RETRY_FAILING_HOURS} h`}
          <span className="block max-w-[16rem] truncate text-xs text-muted-foreground">{source.last_error}</span>
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        OK
        <span className="block text-xs text-muted-foreground">
          {source.last_success_at && <TimeAgo date={source.last_success_at} />}
          {source.last_error && ` · ${source.last_error}`}
        </span>
      </span>
    </span>
  );
}

type SourceDialogState = { source?: AdminSource } | null;
type ConfirmState = { kind: 'source'; source: AdminSource } | { kind: 'category'; category: Category } | null;

export function SourcesManager({ initialSources, categories: initialCategories }: { initialSources: AdminSource[]; categories: Category[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [sources, setSources] = useState(initialSources);
  const [categories, setCategories] = useState(initialCategories);
  const [dialog, setDialog] = useState<SourceDialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [newCategory, setNewCategory] = useState('');
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grouped = useMemo(
    () => categories.map((category) => ({ category, sources: sources.filter((s) => s.category_id === category.id) })),
    [categories, sources],
  );

  const reload = async () => {
    const { data } = await supabase.rpc('admin_list_sources');
    if (data) setSources(data as AdminSource[]);
  };

  const toggle = async (source: AdminSource) => {
    const next = !source.is_enabled;
    setSources((list) => list.map((s) => (s.id === source.id ? { ...s, is_enabled: next } : s)));
    const { error } = await supabase.from('sources').update({ is_enabled: next }).eq('id', source.id);
    if (error) {
      setSources((list) => list.map((s) => (s.id === source.id ? { ...s, is_enabled: !next } : s)));
      showToast({ type: 'error', title: 'Could not update the source', message: error.message });
    } else {
      showToast({
        type: 'success',
        title: `${source.name} ${next ? 'enabled' : 'disabled'}`,
        message: next ? undefined : 'Its articles are hidden from feeds and it will not be fetched.',
      });
    }
  };

  const save = async (draft: SourceDraft): Promise<string | null> => {
    const values = {
      name: draft.name,
      rss_url: draft.rss_url,
      website_url: draft.website_url || null,
      description: draft.description || null,
      category_id: draft.category_id,
    };
    const { error } = dialog?.source
      ? await supabase.from('sources').update(values).eq('id', dialog.source.id)
      : await supabase.from('sources').insert(values);
    if (error) {
      if (error.code === '23505') return 'A source with that name or feed URL already exists.';
      if (error.code === '23514') return 'Please check the URLs (they must start with http:// or https://) and the name.';
      return error.message;
    }
    await reload();
    showToast({
      type: 'success',
      title: dialog?.source ? 'Source updated' : 'Source added',
      message: dialog?.source ? undefined : 'Use “Fetch now” in its menu to import articles straight away.',
    });
    return null;
  };

  const fetchOne = (source: AdminSource) => {
    setFetchingId(source.id);
    startTransition(async () => {
      const result = await runIngestionNow(source.id);
      setFetchingId(null);
      if (!result.ok) showToast({ type: 'error', title: 'Fetch failed', message: result.error });
      else if (result.summary.status === 'skipped') showToast({ type: 'info', title: 'Another run is in progress' });
      else if (result.summary.failed.length) showToast({ type: 'error', title: `${source.name} failed`, message: result.summary.failed[0]?.error });
      else showToast({ type: 'success', title: `${result.summary.inserted} new articles from ${source.name}` });
      await reload();
      router.refresh();
    });
  };

  const removeSource = async (source: AdminSource) => {
    const { error } = await supabase.from('sources').delete().eq('id', source.id);
    if (error) return showToast({ type: 'error', title: 'Could not delete the source', message: error.message });
    setSources((list) => list.filter((s) => s.id !== source.id));
    showToast({ type: 'success', title: `${source.name} deleted` });
  };

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newCategory.trim();
    if (name.length < 2) return;
    const sortOrder = Math.max(0, ...categories.map((c) => c.sort_order)) + 10;
    const { data, error } = await supabase.from('categories').insert({ name, sort_order: sortOrder }).select('id, name, sort_order').single();
    if (error) {
      showToast({ type: 'error', title: 'Could not add the topic', message: error.code === '23505' ? 'That topic already exists.' : error.message });
      return;
    }
    setCategories((list) => [...list, data]);
    setNewCategory('');
    showToast({ type: 'success', title: `Topic “${name}” added`, message: 'Add a source to it so it gets articles.' });
  };

  const removeCategory = async (category: Category) => {
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) {
      showToast({
        type: 'error',
        title: 'Could not delete the topic',
        message: error.code === '23503' ? 'Move or delete its sources first.' : error.message,
      });
      return;
    }
    setCategories((list) => list.filter((c) => c.id !== category.id));
    showToast({ type: 'success', title: `Topic “${category.name}” deleted` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-border pb-4">
        <div>
          <p className="kicker">The newsroom</p>
          <h1 className="headline mt-1 text-4xl">Wire services</h1>
          <p className="mt-1 italic text-muted-foreground">
            {sources.filter((s) => s.is_enabled).length} of {sources.length} sources enabled across {categories.length} sections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog({})}>
            <Plus /> Add source
          </Button>
          <FetchNewsButton label="Fetch all" />
        </div>
      </div>

      {grouped.map(({ category, sources: list }) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`}>
          <h2 id={`cat-${category.id}`} className="label mb-2 flex items-center gap-2 text-foreground">
            {category.name} <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <div className="card-paper overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[26%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-muted-foreground">
                      No sources yet.{' '}
                      <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setDialog({})}>
                        Add one
                      </button>
                    </td>
                  </tr>
                )}
                {list.map((source) => (
                  <tr key={source.id} className={cn('border-b align-top last:border-0', !source.is_enabled && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{source.name}</p>
                      <a
                        href={source.rss_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block max-w-[18rem] truncate text-xs text-muted-foreground hover:underline"
                        title={source.rss_url}
                      >
                        {source.rss_url.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Health source={source} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="tabular-nums text-foreground">{source.article_count}</span> articles
                      {source.latest_article_at && (
                        <span className="block text-xs">
                          newest <TimeAgo date={source.latest_article_at} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={source.is_enabled} onCheckedChange={() => toggle(source)} aria-label={`Enable ${source.name}`} />
                        {source.is_enabled ? 'On' : 'Off'}
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Options for ${source.name}`} disabled={fetchingId === source.id}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => fetchOne(source)} disabled={!source.is_enabled}>
                            <DownloadCloud className="mr-2 h-4 w-4" /> Fetch now
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDialog({ source })}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {source.website_url && (
                            <DropdownMenuItem asChild>
                              <a href={source.website_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" /> Open website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setConfirm({ kind: 'source', source })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>Every source belongs to one topic. Readers pick topics during onboarding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const count = sources.filter((s) => s.category_id === category.id).length;
              return (
                <span key={category.id} className="inline-flex items-center gap-1.5 rounded-[2px] border-[3px] border-double border-rule/30 bg-card/70 py-0.5 pl-3 pr-1 font-label text-[0.88rem]">
                  {category.name}
                  <span className="text-xs text-muted-foreground">{count}</span>
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-30"
                    onClick={() => setConfirm({ kind: 'category', category })}
                    disabled={count > 0}
                    title={count > 0 ? 'Move or delete its sources first' : 'Delete topic'}
                    aria-label={`Delete topic ${category.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
          <form onSubmit={addCategory} className="flex max-w-sm gap-2">
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New topic name" maxLength={40} aria-label="New topic name" />
            <Button type="submit" variant="outline" disabled={newCategory.trim().length < 2}>
              Add topic
            </Button>
          </form>
        </CardContent>
      </Card>

      <SourceDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        categories={categories}
        initial={
          dialog?.source
            ? {
                id: dialog.source.id,
                name: dialog.source.name,
                rss_url: dialog.source.rss_url,
                website_url: dialog.source.website_url ?? '',
                description: dialog.source.description ?? '',
                category_id: dialog.source.category_id,
              }
            : undefined
        }
        onSubmit={save}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive
        title={confirm?.kind === 'source' ? `Delete ${confirm.source.name}?` : `Delete the topic “${confirm?.kind === 'category' ? confirm.category.name : ''}”?`}
        description={
          confirm?.kind === 'source'
            ? `This also deletes its ${confirm.source.article_count} articles, including saved copies. To keep them, disable the source instead.`
            : 'Readers who picked this topic will simply stop seeing it.'
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (confirm?.kind === 'source') await removeSource(confirm.source);
          if (confirm?.kind === 'category') await removeCategory(confirm.category);
        }}
      />
    </div>
  );
}
