'use client';

import { hideArticle, muteSource, unhideArticle, unmuteSource } from '@/components/articles/moderation';
import { ActionDivider, MoreButton, ReadOnLink, SaveButton, ShareButton } from '@/components/articles/story-actions';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { errorText } from '@/lib/error-text';
import { GUEST_MAX_MUTED_PAPERS } from '@/lib/guest';
import { readGuestMutes, saveGuestMutes } from '@/lib/guest-prefs';
import { useI18n } from '@/lib/i18n/client';
import type { ArticleDetail } from '@/lib/types';

/**
 * The story page's printed actions: Save, as under every story on the
 * front page, plus Share and More (hide the story, mute its newspaper; a
 * visitor can mute, kept in this browser). A row on phones
 * and tablets; on wide screens a list in the page's right-hand column, ruled
 * between the lines, that stays in view while the reader scrolls.
 */
export function ArticleActionsBar({ article, userId }: { article: ArticleDetail; userId: string | null }) {
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

  // In the right-hand column each action is a full-width line with a rule under it.
  const line = 'xl:w-full xl:justify-start xl:border-b xl:border-rule/30 xl:pl-0 xl:h-11';
  // Hairlines between the actions where they sit in one row (not on phones, where the row wraps).
  const divider = <ActionDivider className="hidden sm:block xl:hidden" />;

  return (
    <div className="xl:sticky xl:top-24">
      <p className="label mb-1 hidden text-muted-foreground xl:block">{t.article.thisStory}</p>
      <div className="flex flex-wrap items-center gap-x-1 border-y border-rule/30 py-1 xl:flex-col xl:items-stretch xl:border-b-0 xl:py-0">
        <SaveButton saved={saved} disabled={busy} onToggle={toggleSave} className={line} />
        {divider}
        <ShareButton onShare={share} className={line} />
        {divider}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MoreButton className={line} />
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
      {/* The way out to the publisher, in reach before the photograph (the same ticket as under every story). */}
      <ReadOnLink url={article.url} source={article.source_name} wrap className="mt-3 xl:mt-4 xl:flex xl:w-full" />
    </div>
  );
}
