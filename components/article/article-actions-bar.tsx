'use client';

import { hideArticle, muteSource, unhideArticle, unmuteSource } from '@/components/articles/moderation';
import { ActionDivider, MoreButton, SaveButton, ShareButton } from '@/components/articles/story-actions';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { errorText } from '@/lib/error-text';
import { GUEST_MAX_MUTED_PAPERS } from '@/lib/guest';
import { readGuestMutes, saveGuestMutes } from '@/lib/guest-prefs';
import { useI18n } from '@/lib/i18n/client';
import type { FeedArticle } from '@/lib/types';

/**
 * The quick-read sheet's printed actions: Save, as under every story on the
 * front page, plus Share and More (hide the story, mute its newspaper; a
 * visitor can mute, kept in this browser), in one ruled row.
 */
export function ArticleActionsBar({ article, userId }: { article: FeedArticle; userId: string | null }) {
  const { saved, busy, toggleSave, share } = useArticleActions(article, userId);
  const { showToast } = useToast();
  const { t, fmt } = useI18n();

  /** Puts an undone choice back; says so only if that fails. */
  const undo = async (action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) => {
    const { error } = await action();
    if (error) showToast({ type: 'error', title: t.common.somethingWrong, message: errorText(error, t) });
  };

  const hide = async () => {
    if (!userId) return;
    const { error } = await hideArticle(userId, article.id);
    showToast(
      error
        ? { type: 'error', title: t.feed.hideFailed, message: errorText(error, t) }
        : {
            type: 'success',
            title: t.article.hiddenFromFeed,
            action: { label: t.common.undo, onClick: () => void undo(() => unhideArticle(userId, article.id)) },
          },
    );
  };

  /** A visitor mutes into this browser (the same list as Settings > Sections & papers). */
  const muteForVisitor = () => {
    const mutes = readGuestMutes();
    if (!mutes.sourceIds.includes(article.source_id)) {
      saveGuestMutes({ ...mutes, sourceIds: [...mutes.sourceIds, article.source_id].slice(-GUEST_MAX_MUTED_PAPERS) });
    }
    showToast({
      type: 'success',
      title: fmt(t.feed.muted, { source: article.source_name }),
      message: t.article.mutedNote,
      action: {
        label: t.common.undo,
        onClick: () => {
          const now = readGuestMutes();
          saveGuestMutes({ ...now, sourceIds: now.sourceIds.filter((id) => id !== article.source_id) });
        },
      },
    });
  };

  const mute = async () => {
    if (!userId) {
      muteForVisitor();
      return;
    }
    const { error } = await muteSource(userId, article.source_id);
    showToast(
      error
        ? { type: 'error', title: t.feed.muteFailed, message: errorText(error, t) }
        : {
            type: 'success',
            title: fmt(t.feed.muted, { source: article.source_name }),
            message: t.article.mutedNote,
            action: { label: t.common.undo, onClick: () => void undo(() => unmuteSource(userId, article.source_id)) },
          },
    );
  };

  // Hairlines between the actions (not on phones, where the row may wrap).
  const divider = <ActionDivider className="hidden sm:block" />;

  return (
    <div className="flex flex-wrap items-center gap-x-1 border-y border-rule/30 py-1">
      <SaveButton saved={saved} disabled={busy} onToggle={toggleSave} />
      {divider}
      <ShareButton onShare={share} />
      {divider}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreButton />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* Hiding one story is kept in an account; muting a whole newspaper works for visitors too. */}
          {userId && (
            <DropdownMenuItem onSelect={hide}>
              <Ornament name="scissors" className="mr-3 h-[0.8rem] [--ornament-ink:var(--brass-ink)]" /> {t.article.hideFromFeed}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={mute}>
            <Ornament name="broadsheet" className="mr-3 h-[0.95rem] [--ornament-ink:var(--brass-ink)]" /> {fmt(t.story.mute, { source: article.source_name })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
