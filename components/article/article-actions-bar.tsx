'use client';

import { EyeOff, VolumeX } from 'lucide-react';
import { hideArticle, muteSource } from '@/components/articles/moderation';
import { ActionDivider, actionClass, ClipButton, MoreButton } from '@/components/articles/story-actions';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import type { ArticleDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The story page's printed actions: Clip story, as under every story on the
 * front page, plus Share. A row on phones
 * and tablets; on wide screens a list in the page's right-hand column, ruled
 * between the lines, that stays in view while the reader scrolls.
 */
export function ArticleActionsBar({ article, userId }: { article: ArticleDetail; userId: string | null }) {
  const { saved, busy, toggleSave, share } = useArticleActions(article, userId);
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

  // In the right-hand column each action is a full-width line with a rule under it.
  const line = 'xl:w-full xl:justify-start xl:border-b xl:border-rule/30 xl:pl-0 xl:h-11';
  // Hairlines between the actions where they sit in one row (not on phones, where the row wraps).
  const divider = <ActionDivider className="hidden sm:block xl:hidden" />;

  return (
    <div className="xl:sticky xl:top-24">
      <p className="label mb-1 hidden text-muted-foreground xl:block">This story</p>
      <div className="flex flex-wrap items-center gap-x-1 border-y border-rule/30 py-1 xl:flex-col xl:items-stretch xl:border-b-0 xl:py-0">
        <ClipButton saved={saved} disabled={busy} onToggle={toggleSave} className={line} />
        {divider}
        <button type="button" onClick={share} className={cn(actionClass, line)} title="Share this story with someone">
          {/* A carrier pigeon with its letter (Yarrell, 1843). */}
          <Ornament name="pigeon" className="h-[1.05rem]" />
          Share
        </button>
        {userId && (
          <>
            {divider}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <MoreButton className={line} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onSelect={hide}>
                  <EyeOff className="mr-2 h-4 w-4" /> Hide from my feed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={mute}>
                  <VolumeX className="mr-2 h-4 w-4" /> Mute {article.source_name}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
