'use client';

import { useState } from 'react';
import { CheckCircle2, FlaskConical, ImageIcon, XCircle } from 'lucide-react';
import { testFeedUrl, type FeedTestResult } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import type { Category } from '@/lib/types';

export type SourceDraft = {
  name: string;
  rss_url: string;
  website_url: string;
  description: string;
  category_id: string;
};

type SourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initial?: SourceDraft & { id: string };
  onSubmit: (draft: SourceDraft) => Promise<string | null>;
};

const EMPTY: SourceDraft = { name: '', rss_url: '', website_url: '', description: '', category_id: '' };

export function SourceDialog({ open, onOpenChange, categories, initial, onSubmit }: SourceDialogProps) {
  const [draft, setDraft] = useState<SourceDraft>(EMPTY);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<FeedTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening the dialog starts again from the source (or a blank one).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(initial ? { ...initial } : { ...EMPTY, category_id: categories[0]?.id ?? '' });
      setTest(null);
      setError(null);
    }
  }

  const set = (key: keyof SourceDraft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [key]: event.target.value }));

  const runTest = async () => {
    setTesting(true);
    const result = await testFeedUrl(draft.rss_url);
    setTesting(false);
    setTest(result);
    if (result.ok) {
      setDraft((d) => ({
        ...d,
        name: d.name || (result.title ?? '').slice(0, 80),
        website_url: d.website_url || result.link || '',
      }));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.rss_url.trim() || !draft.category_id) {
      setError('Name, feed URL and topic are required.');
      return;
    }
    setBusy(true);
    const problem = await onSubmit({
      name: draft.name.trim(),
      rss_url: draft.rss_url.trim(),
      website_url: draft.website_url.trim(),
      description: draft.description.trim(),
      category_id: draft.category_id,
    });
    setBusy(false);
    if (problem) setError(problem);
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>{initial ? 'Edit source' : 'Add a news source'}</DialogTitle>
            <DialogDescription>Any RSS or Atom feed works. Test it first to see what the app will import.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="source-rss">Feed URL</Label>
            <div className="flex gap-2">
              <Input
                id="source-rss"
                type="url"
                required
                value={draft.rss_url}
                onChange={(e) => {
                  set('rss_url')(e);
                  setTest(null);
                }}
                placeholder="https://example.com/feed.xml"
              />
              <Button type="button" variant="outline" onClick={runTest} disabled={testing || !draft.rss_url}>
                {testing ? <Spinner /> : <FlaskConical />} Test
              </Button>
            </div>
            {test && (
              <div className="border border-border p-3 text-sm">
                {test.ok ? (
                  <>
                    <p className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> {test.title ?? 'Feed'} · {test.itemCount} items
                    </p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {test.sample.map((item) => (
                        <li key={item.title} className="flex items-center gap-1.5">
                          <ImageIcon className={item.image ? 'h-3.5 w-3.5 text-foreground' : 'h-3.5 w-3.5 opacity-30'} />
                          <span className="truncate">{item.title}</span>
                        </li>
                      ))}
                      {test.sample.length === 0 && <li>No recent items (older than 30 days are skipped).</li>}
                    </ul>
                  </>
                ) : (
                  <p className="flex items-center gap-1.5 font-medium text-destructive">
                    <XCircle className="h-4 w-4" /> {test.error}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source-name">Name</Label>
              <Input id="source-name" required maxLength={80} value={draft.name} onChange={set('name')} placeholder="e.g. BBC News - World" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-category">Topic</Label>
              <NativeSelect id="source-category" required value={draft.category_id} onChange={set('category_id')}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source-website">
              Website <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="source-website" type="url" value={draft.website_url} onChange={set('website_url')} placeholder="https://example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source-description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="source-description" maxLength={200} value={draft.description} onChange={set('description')} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Spinner />}
              {initial ? 'Save changes' : 'Add source'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
