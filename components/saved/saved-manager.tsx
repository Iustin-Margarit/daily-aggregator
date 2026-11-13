'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Folder, FolderOpen, Pencil, Plus, Search, SearchX, Trash2, X } from 'lucide-react';
import { FolderDialog } from '@/components/saved/folder-dialog';
import { NoteDialog } from '@/components/saved/note-dialog';
import { SavedItem } from '@/components/saved/saved-item';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import type { SavedArticle, SavedFolder } from '@/lib/types';
import { cn } from '@/lib/utils';

/** What the page shows: a folder ('all' = everything), whether read stories are hidden, a search. */
export type SavedView = { folder: string; hideRead: boolean; q: string };

type SavedManagerProps = {
  userId: string;
  initialArticles: SavedArticle[];
  initialFolders: SavedFolder[];
  initialView: SavedView;
};

/** Creating a folder (optionally straight from a story's menu) or renaming one. */
type FolderDialogState = { mode: 'create'; forArticle?: SavedArticle } | { mode: 'rename'; folder: SavedFolder } | null;

function viewToQuery(view: SavedView) {
  const params = new URLSearchParams();
  if (view.folder !== 'all') params.set('folder', view.folder);
  if (view.hideRead) params.set('hide_read', '1');
  if (view.q) params.set('q', view.q);
  const query = params.toString();
  return query ? `?${query}` : '';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const stories = (n: number) => plural(n, 'story', 'stories');

export function SavedManager({ userId, initialArticles, initialFolders, initialView }: SavedManagerProps) {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [articles, setArticles] = useState(initialArticles);
  const [folders, setFolders] = useState(initialFolders);
  const [view, setView] = useState(initialView);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState>(null);
  const [folderToDelete, setFolderToDelete] = useState<SavedFolder | null>(null);
  const [noteFor, setNoteFor] = useState<SavedArticle | null>(null);

  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const viewRef = useRef(view);

  // Keep the URL in sync. This runs in event handlers, never inside a state
  // updater: Next.js listens to history changes and must not be updated mid-render.
  const updateView = useCallback((patch: Partial<SavedView>) => {
    const next = { ...viewRef.current, ...patch };
    viewRef.current = next;
    setView(next);
    window.history.replaceState(window.history.state, '', `/saved${viewToQuery(next)}`);
  }, []);

  const fail = useCallback(
    (title: string, error: { message: string }) => showToast({ type: 'error', title, message: error.message }),
    [showToast],
  );

  const patchArticle = useCallback((id: string, patch: Partial<SavedArticle>) => {
    setArticles((list) => list.map((a) => (a.article_id === id ? { ...a, ...patch } : a)));
  }, []);

  // ---------------------------------------------------------------- stories

  const setRead = useCallback(
    async (article: SavedArticle, isRead: boolean, quiet = false) => {
      if (article.is_read === isRead) return;
      patchArticle(article.article_id, { is_read: isRead });
      const { error } = await supabase
        .from('saved_articles')
        .update({ is_read: isRead })
        .eq('user_id', userId)
        .eq('article_id', article.article_id);
      if (error) {
        patchArticle(article.article_id, { is_read: !isRead });
        if (!quiet) fail('Could not update the story', error);
      }
    },
    [supabase, userId, patchArticle, fail],
  );

  const toggleRead = useCallback((article: SavedArticle) => setRead(article, !article.is_read), [setRead]);
  // Opening a saved story counts as reading it.
  const markOpened = useCallback((article: SavedArticle) => void setRead(article, true, true), [setRead]);

  const move = useCallback(
    async (article: SavedArticle, folderId: string | null, folderName?: string) => {
      const previous = article.folder_id;
      patchArticle(article.article_id, { folder_id: folderId });
      const { error } = await supabase
        .from('saved_articles')
        .update({ folder_id: folderId })
        .eq('user_id', userId)
        .eq('article_id', article.article_id);
      if (error) {
        patchArticle(article.article_id, { folder_id: previous });
        fail('Could not move the story', error);
        return;
      }
      const name = folderName ?? folders.find((f) => f.id === folderId)?.name;
      showToast({ type: 'success', title: name ? `Moved to “${name}”` : 'Taken out of the folder' });
    },
    [supabase, userId, patchArticle, fail, folders, showToast],
  );

  const restore = useCallback(
    async (removed: SavedArticle) => {
      const { error } = await supabase.from('saved_articles').insert({
        user_id: userId,
        article_id: removed.article_id,
        folder_id: removed.folder_id,
        is_read: removed.is_read,
        notes: removed.notes,
        saved_at: removed.saved_at,
      });
      if (error) return fail('Could not put the story back', error);
      setArticles((list) => [...list, removed]);
    },
    [supabase, userId, fail],
  );

  const remove = useCallback(
    async (article: SavedArticle) => {
      setArticles((list) => list.filter((a) => a.article_id !== article.article_id));
      const { error } = await supabase.from('saved_articles').delete().eq('user_id', userId).eq('article_id', article.article_id);
      if (error) {
        setArticles((list) => [...list, article]);
        fail('Could not remove the story', error);
        return;
      }
      showToast({
        type: 'success',
        title: 'Removed from your saved stories',
        action: { label: 'Undo', onClick: () => void restore(article) },
      });
    },
    [supabase, userId, fail, showToast, restore],
  );

  const saveNote = async (article: SavedArticle, note: string) => {
    const { error } = await supabase
      .from('saved_articles')
      .update({ notes: note || null })
      .eq('user_id', userId)
      .eq('article_id', article.article_id);
    if (error) {
      fail('Could not save the note', error);
      return false;
    }
    patchArticle(article.article_id, { notes: note || null });
    return true;
  };

  // ---------------------------------------------------------------- folders

  const submitFolder = async (name: string): Promise<string | null> => {
    if (!folderDialog) return null;
    const { data, error } =
      folderDialog.mode === 'rename'
        ? await supabase.from('saved_folders').update({ name }).eq('id', folderDialog.folder.id).select('id, name').single()
        : await supabase.from('saved_folders').insert({ name, user_id: userId }).select('id, name').single();
    if (error) {
      if (error.code === '23505') return 'You already have a folder with that name.';
      if (error.message.includes('FOLDER_LIMIT_REACHED')) return 'You can have up to 100 folders. Delete one to add another.';
      return 'Could not save the folder. Please try again.';
    }
    setFolders((list) =>
      (folderDialog.mode === 'rename' ? list.map((f) => (f.id === data.id ? data : f)) : [...list, data]).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    if (folderDialog.mode === 'create' && folderDialog.forArticle) void move(folderDialog.forArticle, data.id, data.name);
    else if (folderDialog.mode === 'create') showToast({ type: 'success', title: `Folder “${data.name}” created` });
    return null;
  };

  const deleteFolder = async (folder: SavedFolder) => {
    const { error } = await supabase.from('saved_folders').delete().eq('id', folder.id);
    if (error) return fail('Could not delete the folder', error);
    setFolders((list) => list.filter((f) => f.id !== folder.id));
    setArticles((list) => list.map((a) => (a.folder_id === folder.id ? { ...a, folder_id: null } : a)));
    if (viewRef.current.folder === folder.id) updateView({ folder: 'all' });
    showToast({ type: 'success', title: `Folder “${folder.name}” deleted`, message: 'The stories in it are still saved.' });
  };

  // ------------------------------------------------------------------- view

  const counts = useMemo(() => {
    const byFolder: Record<string, number> = {};
    for (const a of articles) if (a.folder_id) byFolder[a.folder_id] = (byFolder[a.folder_id] ?? 0) + 1;
    return byFolder;
  }, [articles]);

  const activeFolder = folders.find((f) => f.id === view.folder);
  const inView = useMemo(
    () => (activeFolder ? articles.filter((a) => a.folder_id === activeFolder.id) : articles),
    [articles, activeFolder],
  );

  const visible = useMemo(() => {
    let list = inView;
    if (view.hideRead) list = list.filter((a) => !a.is_read);
    if (view.q) {
      const words = view.q.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((a) => {
        const haystack = `${a.title} ${a.summary ?? ''} ${a.source_name} ${a.notes ?? ''}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }
    return [...list].sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  }, [inView, view.hideRead, view.q]);

  const unreadInView = inView.filter((a) => !a.is_read).length;
  const filtered = view.hideRead || view.q !== '';

  const folderLink = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-serif text-base transition-colors',
      active ? 'bg-foreground text-background' : 'hover:bg-foreground/6',
    );

  return (
    <div className="container py-8 sm:py-10">
      <header className="border-b-2 border-rule pb-5 text-center">
        <p className="kicker">Your clippings</p>
        <h1 className="headline mt-1 text-5xl sm:text-6xl">Saved stories</h1>
        <p className="mx-auto mt-2 max-w-xl text-lg italic text-muted-foreground">
          Stories you saved to read later. They stay here until you remove them.
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Bookmark}
            title="You have not saved any stories yet"
            description={
              <>
                When you see a story you want to keep, press <strong className="not-italic">Save</strong> under it. It will appear
                here, even after it has left the front page.
              </>
            }
            action={
              <Button asChild size="lg">
                <Link href="/feed">Go to the front page</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Folders: a plain list on large screens, a dropdown on phones. */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <h2 className="label mb-2 border-b border-rule pb-1.5 text-foreground">Folders</h2>

            <div className="flex gap-2 lg:hidden">
              <div className="min-w-0 flex-1">
                <NativeSelect aria-label="Show folder" value={view.folder} onChange={(e) => updateView({ folder: e.target.value })}>
                  <option value="all">All saved stories ({articles.length})</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({counts[f.id] ?? 0})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <Button variant="outline" onClick={() => setFolderDialog({ mode: 'create' })}>
                <Plus /> New folder
              </Button>
            </div>

            <nav className="hidden lg:block" aria-label="Folders">
              <button type="button" className={folderLink(view.folder === 'all')} onClick={() => updateView({ folder: 'all' })}>
                <Bookmark className="h-4 w-4 shrink-0" />
                <span className="flex-1">All saved stories</span>
                <span className="text-sm tabular-nums opacity-70">{articles.length}</span>
              </button>
              {folders.map((f) => {
                const active = view.folder === f.id;
                const Icon = active ? FolderOpen : Folder;
                return (
                  <button key={f.id} type="button" className={folderLink(active)} onClick={() => updateView({ folder: f.id })}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-sm tabular-nums opacity-70">{counts[f.id] ?? 0}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-serif text-base text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setFolderDialog({ mode: 'create' })}
              >
                <Plus className="h-4 w-4" /> New folder
              </button>
              {folders.length === 0 && (
                <p className="mt-2 px-3 text-sm italic text-muted-foreground">Folders are optional. Use them to keep stories in groups.</p>
              )}
            </nav>
          </aside>

          <section className="min-w-0" aria-labelledby="saved-list-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="saved-list-heading" className="headline text-3xl">
                  {activeFolder ? activeFolder.name : 'All saved stories'}
                </h2>
                <p className="mt-1 italic text-muted-foreground">
                  {stories(inView.length)}
                  {inView.length > 0 && ` · ${unreadInView === 0 ? 'all read' : `${unreadInView} not read yet`}`}
                </p>
              </div>
              {activeFolder && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFolderDialog({ mode: 'rename', folder: activeFolder })}>
                    <Pencil /> Rename folder
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFolderToDelete(activeFolder)}>
                    <Trash2 /> Delete folder
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-4 border-y border-rule py-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={view.q}
                  onChange={(e) => updateView({ q: e.target.value })}
                  placeholder="Search your saved stories and notes…"
                  className="h-10 w-full border-0 border-b border-input bg-transparent pl-6 pr-8 font-serif text-[1.05rem] italic placeholder:text-muted-foreground/80 focus:border-rule focus:outline-hidden [&::-webkit-search-cancel-button]:hidden"
                  aria-label="Search saved stories"
                />
                {view.q && (
                  <button
                    type="button"
                    onClick={() => updateView({ q: '' })}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Switch id="hide-read" checked={view.hideRead} onCheckedChange={(hideRead) => updateView({ hideRead })} />
                <Label htmlFor="hide-read" className="cursor-pointer">
                  Hide stories I’ve read
                </Label>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="mt-8">
                {inView.length === 0 && activeFolder ? (
                  <EmptyState
                    icon={FolderOpen}
                    title="This folder is empty"
                    description="To add a story, press “Put in a folder” under it and pick this folder."
                    action={
                      <Button variant="outline" onClick={() => updateView({ folder: 'all' })}>
                        Show all saved stories
                      </Button>
                    }
                  />
                ) : view.q ? (
                  <EmptyState
                    icon={SearchX}
                    title={`No saved stories match “${view.q}”`}
                    description="Check the spelling or try fewer words."
                    action={
                      <Button variant="outline" onClick={() => updateView({ q: '' })}>
                        Clear the search
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    title="You have read everything here"
                    description="Turn off “Hide stories I’ve read” to see them again."
                    action={
                      <Button variant="outline" onClick={() => updateView({ hideRead: false })}>
                        Show read stories
                      </Button>
                    }
                  />
                )}
              </div>
            ) : (
              <>
                {filtered && (
                  <p className="mt-4 text-sm italic text-muted-foreground">
                    Showing {visible.length} of {stories(inView.length)}.
                  </p>
                )}
                <ul className="divide-y divide-border">
                  {visible.map((article) => (
                    <li key={article.article_id}>
                      <SavedItem
                        article={article}
                        folders={folders}
                        onOpen={markOpened}
                        onToggleRead={toggleRead}
                        onMove={move}
                        onNewFolder={(forArticle) => setFolderDialog({ mode: 'create', forArticle })}
                        onEditNote={setNoteFor}
                        onRemove={remove}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      <FolderDialog
        open={folderDialog !== null}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        initialName={folderDialog?.mode === 'rename' ? folderDialog.folder.name : ''}
        onSubmit={submitFolder}
      />

      <NoteDialog
        open={noteFor !== null}
        onOpenChange={(open) => !open && setNoteFor(null)}
        articleTitle={noteFor?.title ?? ''}
        initialNote={noteFor?.notes ?? ''}
        onSave={(note) => (noteFor ? saveNote(noteFor, note) : Promise.resolve(false))}
      />

      <ConfirmDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        destructive
        title={`Delete the folder “${folderToDelete?.name ?? ''}”?`}
        description="Only the folder is deleted. The stories in it stay in your saved stories."
        confirmLabel="Delete folder"
        onConfirm={async () => {
          if (folderToDelete) await deleteFolder(folderToDelete);
        }}
      />
    </div>
  );
}
