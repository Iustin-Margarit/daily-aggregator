'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FolderDialog } from '@/components/saved/folder-dialog';
import type { SavedBackend } from '@/components/saved/saved-backend';
import { SavedItem } from '@/components/saved/saved-item';
import { EmptyState } from '@/components/site/empty-state';
import { Engraving } from '@/components/site/engraving';
import { PeekNav } from '@/components/site/peek-nav';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LedgerSearch } from '@/components/ui/ledger-search';
import { Ornament } from '@/components/site/ornament';
import { useToast } from '@/components/ui/toast';
import { errorText } from '@/lib/error-text';
import { useI18n } from '@/lib/i18n/client';
import type { SavedArticle, SavedFolder } from '@/lib/types';
import { FRONT_PATH, loginPath, SAVED_PATH } from '@/lib/routes';

/** What the page shows: a folder ('all' = everything) and a search. */
export type SavedView = { folder: string; q: string };

type SavedManagerProps = {
  /** Where the clippings live: the account, or this browser for a visitor (components/saved/saved-backend.ts). */
  backend: SavedBackend;
  initialArticles: SavedArticle[];
  initialFolders: SavedFolder[];
  initialView: SavedView;
};

/** Below this many stories in view, the list is short enough to scan: no search field. */
const SEARCH_FROM = 4;

/** Creating a folder (optionally straight from a story's menu) or renaming one. */
type FolderDialogState = { mode: 'create'; forArticle?: SavedArticle } | { mode: 'rename'; folder: SavedFolder } | null;

function viewToQuery(view: SavedView) {
  const params = new URLSearchParams();
  if (view.folder !== 'all') params.set('folder', view.folder);
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

  // Opening a saved story counts as reading it: the clipping is franked READ. There is no button for it, and a
  // failed write quietly takes the mark back.
  const markOpened = useCallback(
    (article: SavedArticle) => {
      if (article.is_read) return;
      patchArticle(article.article_id, { is_read: true });
      void backend.setRead(article.article_id, true).then(({ error }) => {
        if (error) patchArticle(article.article_id, { is_read: false });
      });
    },
    [backend, patchArticle],
  );

  const move = useCallback(
    async (article: SavedArticle, folderId: string | null) => {
      const previous = article.folder_id;
      patchArticle(article.article_id, { folder_id: folderId });
      const { error } = await backend.setFolder(article.article_id, folderId);
      if (error) {
        patchArticle(article.article_id, { folder_id: previous });
        fail(w.moveFailed, error);
        return;
      }
      // No notice: the story shows its folder at once.
    },
    [backend, patchArticle, fail, w],
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
    if (folderDialog.mode === 'create' && folderDialog.forArticle) void move(folderDialog.forArticle, data.id);
    return null;
  };

  const deleteFolder = async (folder: SavedFolder) => {
    const { error } = await backend.deleteFolder(folder.id);
    if (error) return fail(w.folderDeleteFailed, error);
    setFolders((list) => list.filter((f) => f.id !== folder.id));
    setArticles((list) => list.map((a) => (a.folder_id === folder.id ? { ...a, folder_id: null } : a)));
    if (viewRef.current.folder === folder.id) updateView({ folder: 'all' });
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
    if (view.q) {
      const words = view.q.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((a) => {
        const haystack = `${a.title} ${a.summary ?? ''} ${a.source_name}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }
    return [...list].sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  }, [inView, view.q]);

  // A short list is read at a glance; the search field only earns its place from a few stories up (and stays while
  // a search is on, so it can be cleared).
  const showSearch = inView.length >= SEARCH_FROM || view.q !== '';

  return (
    <div className="container py-5 sm:py-8">
      {/* A compact title row, so the stories start high on a phone: the quill and the title. */}
      <header className="flex items-center gap-3 sm:gap-4">
        <Engraving name="quill" className="h-11 w-auto max-w-[2.75rem] shrink-0 sm:h-14 sm:max-w-[3.5rem]" />
        <div className="min-w-0">
          <h1 className="headline text-[1.9rem] leading-none sm:text-[2.6rem]">{w.title}</h1>
        </div>
      </header>

      {articles.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            level={2}
            engraving="kitten-sit"
            title={w.emptyTitle}
            description={rich(w.emptyNote, { save: <strong>{t.story.save}</strong> })}
            action={
              <Button asChild size="lg">
                <Link href={FRONT_PATH}>{w.goFront}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-0">
          {/* The clippings drawer: the folders as an index down the margin on wide screens, a ribbon on phones. The tabs carry the counts. */}
          <aside className="min-w-0 lg:border-r lg:border-rule/40 lg:pr-8">
            <p className="label mb-2 hidden text-(--brass-ink) lg:block">{w.folders}</p>
            <PeekNav kind="folders" aria-label={w.folders} className="folder-index">
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
            </PeekNav>
          </aside>

          <section className="min-w-0 lg:pl-10" aria-labelledby="saved-list-heading">
            {activeFolder ? (
              /* A folder: its name and count, with Rename and Delete beside them at one small height. */
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <h2 id="saved-list-heading" className="headline min-w-0 break-words text-[1.6rem] leading-tight sm:text-[1.9rem]">
                    {activeFolder.name}
                  </h2>
                  <span className="shrink-0 italic text-muted-foreground">{stories(inView.length)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={w.renameFolder}
                    onClick={() => setFolderDialog({ mode: 'rename', folder: activeFolder })}
                  >
                    <Ornament name="nib" className="h-[0.95rem] [--ornament-ink:currentColor]" /> {w.rename}
                  </Button>
                  <Button variant="outline" size="sm" aria-label={w.deleteFolder} onClick={() => setFolderToDelete(activeFolder)}>
                    <Ornament name="scissors" className="h-[0.95rem] [--ornament-ink:currentColor]" /> {w.delete}
                  </Button>
                </div>
              </div>
            ) : (
              // All saved: the tab above already says so, with the count; the heading is for screen readers.
              <h2 id="saved-list-heading" className="sr-only">
                {w.allSavedStories}
              </h2>
            )}

            {showSearch && (
              <LedgerSearch
                value={view.q}
                onChange={(q) => updateView({ q })}
                onClear={() => updateView({ q: '' })}
                placeholder={w.search}
                label={w.searchLabel}
                clearLabel={w.clearSearch}
                className={activeFolder ? 'mt-3' : undefined}
              />
            )}

            {visible.length === 0 ? (
              <div className="mt-4">
                {inView.length === 0 && activeFolder ? (
                  <EmptyState
                    engraving="kitten-pounce"
                    title={w.emptyFolder}
                    className="px-5 py-8 sm:px-8 sm:py-10"
                    action={
                      <Button variant="outline" className="h-auto min-h-10 whitespace-normal py-2" onClick={() => updateView({ folder: 'all' })}>
                        {w.showAll}
                      </Button>
                    }
                  />
                ) : (
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
                )}
              </div>
            ) : (
              <>
                {view.q !== '' && (
                  <p className="mt-4 text-sm italic text-muted-foreground">
                    {fmt(w.showing, { n: visible.length, total: stories(inView.length) })}
                  </p>
                )}
                <ul className="card-paper mt-4 divide-y divide-dashed divide-border px-3.5 sm:px-6">
                  {visible.map((article) => (
                    <li key={article.article_id}>
                      <SavedItem
                        article={article}
                        folders={folders}
                        onOpen={markOpened}
                        onMove={move}
                        onNewFolder={(forArticle) => setFolderDialog({ mode: 'create', forArticle })}
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

      {/* Visitors: one line under their stories on where they are kept, and the way to keep them everywhere. */}
      {guest && (
        <p className="mt-10 border-t border-dashed border-rule/45 pt-5 text-pretty text-center text-[0.95rem] italic text-muted-foreground">
          {rich(w.guestNote, {
            login: (
              <Link
                href={loginPath(SAVED_PATH)}
                className="font-medium not-italic text-foreground underline decoration-(--ink-gold) underline-offset-4 hover:decoration-2"
              >
                {t.common.logIn}
              </Link>
            ),
          })}
        </p>
      )}

      <FolderDialog
        open={folderDialog !== null}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        initialName={folderDialog?.mode === 'rename' ? folderDialog.folder.name : ''}
        onSubmit={submitFolder}
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
