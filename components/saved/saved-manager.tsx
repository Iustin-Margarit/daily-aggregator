'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { FolderDialog } from '@/components/saved/folder-dialog';
import { NoteDialog } from '@/components/saved/note-dialog';
import type { SavedBackend } from '@/components/saved/saved-backend';
import { SavedItem } from '@/components/saved/saved-item';
import { EmptyState } from '@/components/site/empty-state';
import { PageHeader } from '@/components/site/page-header';
import { ScrollDivider } from '@/components/site/scroll-divider';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { Ornament } from '@/components/site/ornament';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/toast';
import type { SavedArticle, SavedFolder } from '@/lib/types';

/** What the page shows: a folder ('all' = everything), whether read stories are hidden, a search. */
export type SavedView = { folder: string; hideRead: boolean; q: string };

type SavedManagerProps = {
  /** Where the clippings live: the account, or this browser for a visitor (components/saved/saved-backend.ts). */
  backend: SavedBackend;
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

export function SavedManager({ backend, initialArticles, initialFolders, initialView }: SavedManagerProps) {
  const { showToast } = useToast();
  const guest = backend.kind === 'browser';

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
      const { error } = await backend.setRead(article.article_id, isRead);
      if (error) {
        patchArticle(article.article_id, { is_read: !isRead });
        if (!quiet) fail('Could not update the story', error);
      }
    },
    [backend, patchArticle, fail],
  );

  const toggleRead = useCallback((article: SavedArticle) => setRead(article, !article.is_read), [setRead]);
  // Opening a saved story counts as reading it.
  const markOpened = useCallback((article: SavedArticle) => void setRead(article, true, true), [setRead]);

  const move = useCallback(
    async (article: SavedArticle, folderId: string | null, folderName?: string) => {
      const previous = article.folder_id;
      patchArticle(article.article_id, { folder_id: folderId });
      const { error } = await backend.setFolder(article.article_id, folderId);
      if (error) {
        patchArticle(article.article_id, { folder_id: previous });
        fail('Could not move the story', error);
        return;
      }
      const name = folderName ?? folders.find((f) => f.id === folderId)?.name;
      showToast({ type: 'success', title: name ? `Moved to “${name}”` : 'Taken out of the folder' });
    },
    [backend, patchArticle, fail, folders, showToast],
  );

  const restore = useCallback(
    async (removed: SavedArticle) => {
      const { error } = await backend.restore(removed);
      if (error) return fail('Could not put the story back', error);
      setArticles((list) => [...list, removed]);
    },
    [backend, fail],
  );

  const remove = useCallback(
    async (article: SavedArticle) => {
      setArticles((list) => list.filter((a) => a.article_id !== article.article_id));
      const { error } = await backend.remove(article.article_id);
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
    [backend, fail, showToast, restore],
  );

  const saveNote = async (article: SavedArticle, note: string) => {
    const { error } = await backend.setNote(article.article_id, note || null);
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
      folderDialog.mode === 'rename' ? await backend.renameFolder(folderDialog.folder.id, name) : await backend.createFolder(name);
    if (error || !data) {
      if (error?.code === '23505') return 'You already have a folder with that name.';
      if (error?.message.includes('FOLDER_LIMIT_REACHED')) {
        return guest ? 'This browser holds up to 30 folders. Delete one to add another.' : 'You can have up to 100 folders. Delete one to add another.';
      }
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
    const { error } = await backend.deleteFolder(folder.id);
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

  return (
    <div className="container py-8 sm:py-10">
      <PageHeader
        kicker="Your clippings"
        title="Saved stories"
        engraving="quill"
        description="Stories you saved to read later. They stay here until you remove them."
      />
      <ScrollDivider className="mt-8" />

      {guest && (
        <aside className="card-paper mt-8 flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="About these clippings">
          <div className="flex items-center gap-4">
            <Ornament name="scissors" className="hidden h-5 sm:block" />
            <div>
              <p className="font-display text-[1.1rem] font-semibold">Kept in this browser</p>
              <p className="text-[0.95rem] italic text-muted-foreground">
                Your clippings, folders and notes stay on this device. A free account keeps them on every device; they move into it when you sign in.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login?next=/saved">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Create an account</Link>
            </Button>
          </div>
        </aside>
      )}

      {articles.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            engraving="kitten-sit"
            title="You have not saved any stories yet"
            description={
              <>
                When you see a story you want to keep, press <strong>Clip story</strong> under it. It will appear here, even after it
                has left the front page.
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
        <div className="mt-8 grid gap-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-0">
          {/* The clippings drawer: the folders as an index down the margin on wide screens, a ribbon on phones. */}
          <aside className="min-w-0 lg:border-r lg:border-rule/40 lg:pr-8">
            <p className="label mb-2 hidden text-(--brass-ink) lg:block">Folders</p>
            <nav aria-label="Folders" className="folder-index">
              <button type="button" className="dept-tab" aria-pressed={view.folder === 'all'} onClick={() => updateView({ folder: 'all' })}>
                <span className="folder-name">All saved</span>
                <span className="tabular-nums tracking-normal opacity-70">{articles.length}</span>
              </button>
              {folders.map((f) => (
                <button key={f.id} type="button" className="dept-tab" aria-pressed={view.folder === f.id} onClick={() => updateView({ folder: f.id })}>
                  <span className="folder-name max-w-48 truncate">{f.name}</span>
                  <span className="tabular-nums tracking-normal opacity-70">{counts[f.id] ?? 0}</span>
                </button>
              ))}
            </nav>
            <Button variant="outline" size="sm" className="mt-3 w-full lg:mt-4" onClick={() => setFolderDialog({ mode: 'create' })}>
              <Plus /> New folder
            </Button>
          </aside>

          <section className="min-w-0 lg:pl-10" aria-labelledby="saved-list-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="saved-list-heading" className="headline text-[1.9rem]">
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

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="search-glass pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rotate-[-30deg]" aria-hidden="true">
                  <Ornament name="magnifier" className="block h-[1.45rem]" />
                </span>
                <input
                  type="search"
                  value={view.q}
                  onChange={(e) => updateView({ q: e.target.value })}
                  placeholder="Search your saved stories and notes…"
                  className="ledger-field"
                  aria-label="Search saved stories"
                />
                {view.q && (
                  <button
                    type="button"
                    onClick={() => updateView({ q: '' })}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[2px] p-1 text-muted-foreground hover:bg-foreground/7 hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox id="hide-read" checked={view.hideRead} onCheckedChange={(hideRead) => updateView({ hideRead: hideRead === true })} />
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
                    engraving="kitten-peer"
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
                    engraving="kitten-curious"
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
                <ul className="card-paper mt-4 divide-y divide-dashed divide-border px-4 sm:px-6">
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
