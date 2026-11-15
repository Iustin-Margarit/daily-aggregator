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
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/toast';
import { errorText } from '@/lib/error-text';
import { useI18n } from '@/lib/i18n/client';
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

export function SavedManager({ backend, initialArticles, initialFolders, initialView }: SavedManagerProps) {
  const { showToast } = useToast();
  const guest = backend.kind === 'browser';
  const { t, fmt, rich, plural } = useI18n();
  const w = t.saved;
  const stories = (n: number) => plural(w.storyCount, n);

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
    (title: string, error: { message: string }) => showToast({ type: 'error', title, message: errorText(error, t) }),
    [showToast, t],
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
        if (!quiet) fail(w.updateFailed, error);
      }
    },
    [backend, patchArticle, fail, w],
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
        fail(w.moveFailed, error);
        return;
      }
      const name = folderName ?? folders.find((f) => f.id === folderId)?.name;
      showToast({ type: 'success', title: name ? fmt(w.movedTo, { name }) : w.takenOut });
    },
    [backend, patchArticle, fail, folders, showToast, fmt, w],
  );

  const restore = useCallback(
    async (removed: SavedArticle) => {
      const { error } = await backend.restore(removed);
      if (error) return fail(w.restoreFailed, error);
      setArticles((list) => [...list, removed]);
    },
    [backend, fail, w],
  );

  const remove = useCallback(
    async (article: SavedArticle) => {
      setArticles((list) => list.filter((a) => a.article_id !== article.article_id));
      const { error } = await backend.remove(article.article_id);
      if (error) {
        setArticles((list) => [...list, article]);
        fail(w.removeFailed, error);
        return;
      }
      showToast({
        type: 'success',
        title: w.removed,
        action: { label: t.common.undo, onClick: () => void restore(article) },
      });
    },
    [backend, fail, showToast, restore, t.common.undo, w],
  );

  const saveNote = async (article: SavedArticle, note: string) => {
    const { error } = await backend.setNote(article.article_id, note || null);
    if (error) {
      fail(w.noteFailed, error);
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
      if (error?.code === '23505') return w.folderExists;
      if (error?.message.includes('FOLDER_LIMIT_REACHED')) return guest ? w.guestFolderLimit : w.folderLimit;
      return w.folderFailed;
    }
    setFolders((list) =>
      (folderDialog.mode === 'rename' ? list.map((f) => (f.id === data.id ? data : f)) : [...list, data]).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    if (folderDialog.mode === 'create' && folderDialog.forArticle) void move(folderDialog.forArticle, data.id, data.name);
    else if (folderDialog.mode === 'create') showToast({ type: 'success', title: fmt(w.folderCreated, { name: data.name }) });
    return null;
  };

  const deleteFolder = async (folder: SavedFolder) => {
    const { error } = await backend.deleteFolder(folder.id);
    if (error) return fail(w.folderDeleteFailed, error);
    setFolders((list) => list.filter((f) => f.id !== folder.id));
    setArticles((list) => list.map((a) => (a.folder_id === folder.id ? { ...a, folder_id: null } : a)));
    if (viewRef.current.folder === folder.id) updateView({ folder: 'all' });
    showToast({ type: 'success', title: fmt(w.folderDeleted, { name: folder.name }), message: w.folderDeletedNote });
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
      <PageHeader kicker={w.kicker} title={w.title} engraving="quill" description={w.description} />
      <ScrollDivider className="mt-8" />

      {guest && (
        <aside className="card-paper mt-8 flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label={w.about}>
          <div className="flex items-center gap-4">
            <Engraving name="quill" className="hidden h-9 sm:block" />
            <div>
              <p className="font-display text-[1.1rem] font-semibold">{w.guestTitle}</p>
              <p className="text-pretty text-[0.95rem] italic text-muted-foreground">{w.guestNote}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login?next=/saved">{t.common.logIn}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">{t.common.createAccount}</Link>
            </Button>
          </div>
        </aside>
      )}

      {articles.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            level={2}
            engraving="kitten-sit"
            title={w.emptyTitle}
            description={rich(w.emptyNote, { save: <strong>{t.story.save}</strong> })}
            action={
              <Button asChild size="lg">
                <Link href="/feed">{w.goFront}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-0">
          {/* The clippings drawer: the folders as an index down the margin on wide screens, a ribbon on phones. */}
          <aside className="min-w-0 lg:border-r lg:border-rule/40 lg:pr-8">
            <p className="label mb-2 hidden text-(--brass-ink) lg:block">{w.folders}</p>
            <nav aria-label={w.folders} className="folder-index">
              <button type="button" className="dept-tab" aria-pressed={view.folder === 'all'} onClick={() => updateView({ folder: 'all' })}>
                <span className="folder-name">{w.allSaved}</span>
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
              <Plus /> {w.newFolder}
            </Button>
          </aside>

          <section className="min-w-0 lg:pl-10" aria-labelledby="saved-list-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="saved-list-heading" className="headline text-[1.9rem]">
                  {activeFolder ? activeFolder.name : w.allSavedStories}
                </h2>
                <p className="mt-1 italic text-muted-foreground">
                  {stories(inView.length)}
                  {inView.length > 0 && ` · ${unreadInView === 0 ? w.allRead : plural(w.notRead, unreadInView)}`}
                </p>
              </div>
              {activeFolder && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFolderDialog({ mode: 'rename', folder: activeFolder })}>
                    <Pencil /> {w.renameFolder}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFolderToDelete(activeFolder)}>
                    <Trash2 /> {w.deleteFolder}
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
                  placeholder={w.search}
                  className="ledger-field"
                  aria-label={w.searchLabel}
                />
                {view.q && (
                  <button
                    type="button"
                    onClick={() => updateView({ q: '' })}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[2px] p-1 text-muted-foreground hover:bg-foreground/7 hover:text-foreground"
                    aria-label={w.clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox id="hide-read" checked={view.hideRead} onCheckedChange={(hideRead) => updateView({ hideRead: hideRead === true })} />
                <Label htmlFor="hide-read" className="cursor-pointer">
                  {w.hideRead}
                </Label>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="mt-8">
                {inView.length === 0 && activeFolder ? (
                  <EmptyState
                    icon={FolderOpen}
                    title={w.emptyFolder}
                    description={w.emptyFolderNote}
                    action={
                      <Button variant="outline" onClick={() => updateView({ folder: 'all' })}>
                        {w.showAll}
                      </Button>
                    }
                  />
                ) : view.q ? (
                  <EmptyState
                    engraving="kitten-peer"
                    title={fmt(w.noMatch, { q: view.q })}
                    description={w.noMatchNote}
                    action={
                      <Button variant="outline" onClick={() => updateView({ q: '' })}>
                        {w.clearTheSearch}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    engraving="kitten-curious"
                    title={w.allReadTitle}
                    description={w.allReadNote}
                    action={
                      <Button variant="outline" onClick={() => updateView({ hideRead: false })}>
                        {w.showRead}
                      </Button>
                    }
                  />
                )}
              </div>
            ) : (
              <>
                {filtered && (
                  <p className="mt-4 text-sm italic text-muted-foreground">
                    {fmt(w.showing, { n: visible.length, total: stories(inView.length) })}
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
        title={fmt(w.deleteFolderTitle, { name: folderToDelete?.name ?? '' })}
        description={w.deleteFolderNote}
        confirmLabel={w.deleteFolder}
        onConfirm={async () => {
          if (folderToDelete) await deleteFolder(folderToDelete);
        }}
      />
    </div>
  );
}
