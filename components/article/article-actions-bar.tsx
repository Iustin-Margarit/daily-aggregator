'use client';

import Link from 'next/link';
import { Bookmark, EyeOff, Heart, MessageCircle, MoreHorizontal, Share2, VolumeX } from 'lucide-react';
import { hideArticle, muteSource } from '@/components/articles/moderation';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import type { ArticleDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ArticleActionsBar({ article, userId }: { article: ArticleDetail; userId: string | null }) {
  const { liked, likeCount, saved, busy, toggleLike, toggleSave, share } = useArticleActions(article, userId);
  const { showToast } = useToast();

  const hide = async () => {
    if (!userId) return;
    const { error } = await hideArticle(userId, article.id);
    showToast(
      error
        ? { type: 'error', title: 'Could not hide the story', message: error.message }
        : { type: 'success', title: 'Hidden from your feed' },
    );
  };

  const mute = async () => {
    if (!userId) return;
    const { error } = await muteSource(userId, article.source_id);
    showToast(
      error
        ? { type: 'error', title: 'Could not mute the source', message: error.message }
        : {
            type: 'success',
            title: `${article.source_name} muted`,
            message: 'Their stories will no longer appear in your feed. Undo from your profile.',
          },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={toggleLike}
        disabled={busy.like}
        aria-pressed={liked}
        className={cn(liked && 'border-(--ink-accent) bg-(--ink-accent) text-white hover:bg-(--ink-accent)/90 hover:text-white')}
      >
        <Heart className={cn(liked && 'fill-current')} />
        {liked ? 'Liked' : 'Like'}
        {likeCount > 0 && <span className="tabular-nums opacity-80">· {likeCount}</span>}
      </Button>
      <Button
        variant={saved ? 'default' : 'outline'}
        onClick={toggleSave}
        disabled={busy.save}
        aria-pressed={saved}
        className={cn(saved && 'hover:bg-primary/85')}
      >
        <Bookmark className={cn(saved && 'fill-current')} />
        {saved ? 'Saved' : 'Save'}
      </Button>
      <Button variant="outline" onClick={share}>
        <Share2 /> Share
      </Button>
      <Button variant="ghost" asChild>
        <Link href="#comments">
          <MessageCircle /> Letters
        </Link>
      </Button>
      {userId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options" className="ml-auto">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={hide}>
              <EyeOff className="mr-2 h-4 w-4" /> Hide from my feed
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={mute}>
              <VolumeX className="mr-2 h-4 w-4" /> Mute {article.source_name}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
