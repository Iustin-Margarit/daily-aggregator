'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Check, FolderInput, NotebookPen, RotateCcw, Trash2 } from 'lucide-react';
import { ArticleImage } from '@/components/articles/article-image';
import { TimeAgo } from '@/components/site/time-ago';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cleanText } from '@/lib/text';
import type { SavedArticle, SavedFolder } from '@/lib/types';
import { cn } from '@/lib/utils';

type SavedItemProps = {
  article: SavedArticle;
  folders: SavedFolder[];
  onOpen: (article: SavedArticle) => void;
  onToggleRead: (article: SavedArticle) => void;
  onMove: (article: SavedArticle, folderId: string | null) => void;
  onNewFolder: (article: SavedArticle) => void;
  onEditNote: (article: SavedArticle) => void;
  onRemove: (article: SavedArticle) => void;
};

/** One saved story: picture, headline, the reader's note and plainly labelled actions. */
function SavedItemImpl({ article, folders, onOpen, onToggleRead, onMove, onNewFolder, onEditNote, onRemove }: SavedItemProps) {
  const folder = folders.find((f) => f.id === article.folder_id);
  const href = `/article/${article.slug}`;
  const summary = cleanText(article.summary);
  const title = cleanText(article.title);

  return (
    <article className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6">
      <Link
        href={href}
        onClick={() => onOpen(article)}
        tabIndex={-1}
        aria-hidden="true"
        className="block self-start border border-rule/60 p-0.5 sm:row-span-2"
      >
        <ArticleImage src={article.image_url} alt="" category={article.category_name} width={400} className="aspect-4/3 w-full" />
      </Link>

      <div className="min-w-0">
        <p className="byline flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-(--ink-accent)">{article.category_name}</span>
          <span aria-hidden="true">·</span>
          <span>{article.source_name}</span>
          <span aria-hidden="true">·</span>
          <span>
            Saved <TimeAgo date={article.saved_at} />
          </span>
          {article.is_read && (
            <span className="ml-1 inline-flex items-center gap-1 border border-border px-1.5 text-foreground/70">
              <Check className="h-3 w-3" /> Read
            </span>
          )}
        </p>

        <h2 className={cn('headline mt-1.5 text-xl sm:text-2xl', article.is_read && 'text-foreground/60')}>
          <Link href={href} onClick={() => onOpen(article)} className="decoration-1 underline-offset-4 hover:underline">
            {title}
          </Link>
        </h2>

        {summary && <p className="mt-1.5 line-clamp-2 text-[0.95rem] leading-relaxed text-foreground/80">{summary}</p>}

        {article.notes && (
          <button
            type="button"
            onClick={() => onEditNote(article)}
            className="mt-3 block w-full border-l-2 border-(--ink-accent) bg-(--ink-accent)/6 px-3 py-2 text-left"
            title="Edit your note"
          >
            <span className="label block text-[0.6rem] text-(--ink-accent)">Your note</span>
            <span className="mt-0.5 block whitespace-pre-line font-serif text-[0.95rem] italic leading-snug">{article.notes}</span>
          </button>
        )}

        {folder && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            In the folder <span className="font-semibold not-italic text-foreground">{folder.name}</span>
          </p>
        )}
      </div>

      {/* Full width under the picture on phones, beside it on larger screens. */}
      <div className="col-span-2 mt-3 flex flex-wrap gap-2 sm:col-span-1 sm:col-start-2">
        <Button variant="outline" size="sm" onClick={() => onToggleRead(article)}>
          {article.is_read ? <RotateCcw /> : <Check />}
          {article.is_read ? 'Mark as unread' : 'Mark as read'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderInput /> {folder ? 'Change folder' : 'Put in a folder'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Put this story in…</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={article.folder_id ?? 'none'} onValueChange={(value) => onMove(article, value === 'none' ? null : value)}>
              <DropdownMenuRadioItem value="none">No folder</DropdownMenuRadioItem>
              {folders.map((f) => (
                <DropdownMenuRadioItem key={f.id} value={f.id}>
                  {f.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onNewFolder(article)}>+ New folder…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={() => onEditNote(article)}>
          <NotebookPen /> {article.notes ? 'Edit note' : 'Add a note'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onRemove(article)} className="text-destructive hover:text-destructive">
          <Trash2 /> Remove
        </Button>
      </div>
    </article>
  );
}

export const SavedItem = memo(SavedItemImpl);
