'use client';

import { useEffect, useState } from 'react';
import { hideArticle, muteSource, unhideArticle, unmuteSource } from '@/components/articles/moderation';
import { ActionDivider, MoreButton, SaveButton, ShareButton } from '@/components/articles/story-actions';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Ornament } from '@/components/site/ornament';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { errorText } from '@/lib/error-text';
import { GUEST_MAX_MUTED_PAPERS } from '@/lib/guest';
import { readGuestHidden, readGuestMutes, saveGuestMutes, setGuestHidden } from '@/lib/guest-prefs';
import { markStoryHidden, markStoryShown, setKnownHidden, setSourceMuted, storyIsOnPage, useKnownHidden, useSourceMuted } from '@/lib/hidden-stories';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/client';
import type { FeedArticle } from '@/lib/types';

/**
 * The quick-read sheet's printed actions: Save, as under every story on the
 * front page, plus Share and More (hide the story, mute its newspaper), in one
 * ruled row. Visitors hide and mute too, kept in this browser (lib/guest-prefs.ts).
 *
 * Hide closes the sheet and leaves a slip in the story's place on the page ("Story hidden", Undo, ×:
 * lib/hidden-stories.ts); only when the story is not printed on the page does a notice offer Undo instead.
 * A hidden story is still found by a search: its menu then offers Unhide instead (kept open, it turns back into
 * Hide). Mute keeps the menu open and turns into "Unmute [paper]" with a Muted tag, so the reader sees it took.
 */
export function ArticleActionsBar({ article, userId, onHidden }: { article: FeedArticle; userId: string | null; onHidden?: () => void }) {
  const { saved, busy, toggleSave, share } = useArticleActions(article, userId);
  const { showToast } = useToast();
  const { t, fmt } = useI18n();
  const sourceId = article.source_id;

  // An account's paper muted in this tab (by this menu or Settings); a visitor's list is read from the browser when the menu opens.
  const mutedHere = useSourceMuted(sourceId);
  const [guestMuted, setGuestMuted] = useState(false);
  const muted = userId ? (mutedHere ?? false) : guestMuted;
  const [muting, setMuting] = useState(false);
  // Whether this story is hidden (a search shows hidden stories too): asked once the sheet shows the story.
  const knownHidden = useKnownHidden(article.id);
  const hidden = knownHidden ?? false;
  const [unhiding, setUnhiding] = useState(false);
  const articleId = article.id;

  useEffect(() => {
    if (!userId) {
      // This browser's own list: cheap, so read every time (Settings or another tab may have changed it).
      setKnownHidden(articleId, readGuestHidden().includes(articleId));
      return;
    }
    if (knownHidden !== undefined) return;
    let current = true;
    void createClient()
      .from('hidden_articles')
      .select('article_id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (current && !error) setKnownHidden(articleId, Boolean(data));
      });
    return () => {
      current = false;
    };
  }, [articleId, userId, knownHidden]);

  /** Shows the story in the paper again (the account's list, or this browser's); true when that worked. */
  const showAgain = async (): Promise<boolean> => {
    if (!userId) {
      setGuestHidden(article.id, false);
      return true;
    }
    const { error } = await unhideArticle(userId, article.id);
    if (error) showToast({ type: 'error', title: t.common.somethingWrong, message: errorText(error, t) });
    return !error;
  };

  const unhide = async () => {
    if (unhiding) return;
    setUnhiding(true);
    if (await showAgain()) markStoryShown(article.id);
    setUnhiding(false);
  };

  const hide = async () => {
    if (userId) {
      const { error } = await hideArticle(userId, article.id);
      if (error) {
        showToast({ type: 'error', title: t.feed.hideFailed, message: errorText(error, t) });
        return;
      }
    } else {
      setGuestHidden(article.id, true);
    }
    const undo = showAgain;
    const visible = storyIsOnPage(article.id);
    markStoryHidden(article.id, undo);
    onHidden?.();
    // Not printed on the page underneath (a shared link, a story from the sheet's own lists): Undo in a notice.
    if (!visible) showToast({ type: 'success', title: t.article.hiddenFromFeed, action: { label: t.common.undo, onClick: () => void undo() } });
  };

  /** A visitor mutes into this browser (the same list as Settings > Sections & papers). */
  const setGuestMute = (value: boolean) => {
    const mutes = readGuestMutes();
    const others = mutes.sourceIds.filter((id) => id !== sourceId);
    const sourceIds = value ? [...others, sourceId].slice(-GUEST_MAX_MUTED_PAPERS) : others;
    saveGuestMutes({ ...mutes, sourceIds });
    setGuestMuted(value);
  };

  const toggleMute = async () => {
    const next = !muted;
    if (!userId) {
      setGuestMute(next);
      return;
    }
    if (muting) return;
    setMuting(true);
    setSourceMuted(sourceId, next);
    const { error } = next ? await muteSource(userId, sourceId) : await unmuteSource(userId, sourceId);
    setMuting(false);
    if (error) {
      setSourceMuted(sourceId, !next);
      showToast({ type: 'error', title: next ? t.feed.muteFailed : t.settings.muted.unmuteFailed, message: errorText(error, t) });
    }
  };

  // Hairlines between the actions (not on phones, where the row may wrap).
  const divider = <ActionDivider className="hidden sm:block" />;

  return (
    <div className="flex flex-wrap items-center gap-x-1 border-y border-rule/30 py-1">
      <SaveButton saved={saved} disabled={busy} onToggle={toggleSave} />
      {divider}
      <ShareButton onShare={share} />
      {divider}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) return;
          if (!userId) {
            setGuestMuted(readGuestMutes().sourceIds.includes(sourceId));
            setKnownHidden(articleId, readGuestHidden().includes(articleId));
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <MoreButton />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={{ top: 72, bottom: 16, left: 8, right: 8 }} className="w-64">
          {hidden ? (
            // Found by a search: bring it back to the paper. Stays open and turns back into Hide.
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void unhide();
              }}
              disabled={unhiding}
            >
              <Ornament name="scissors" className="mr-3 h-[0.8rem] [--ornament-ink:var(--brass-ink)]" />
              <span className="min-w-0 flex-1">{t.article.unhide}</span>
              <span className="ml-2 shrink-0 rounded-[2px] border border-(--ink-gold)/60 px-1.5 font-label text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--brass-ink)">
                {t.article.hiddenTag}
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={hide}>
              <Ornament name="scissors" className="mr-3 h-[0.8rem] [--ornament-ink:var(--brass-ink)]" /> {t.article.hideFromFeed}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            // Stays open: the item itself turns into "Unmute …" with a Muted tag and a line on what it does.
            onSelect={(event) => {
              event.preventDefault();
              void toggleMute();
            }}
            disabled={muting}
            className="flex-wrap"
          >
            <Ornament name="broadsheet" className="mr-3 h-[0.95rem] [--ornament-ink:var(--brass-ink)]" />
            <span className="min-w-0 flex-1">{fmt(muted ? t.story.unmute : t.story.mute, { source: article.source_name })}</span>
            {muted && (
              <span className="clip-stamp ml-2 shrink-0 rounded-[2px] border border-(--ink-gold)/60 px-1.5 font-label text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--brass-ink)">
                {t.story.mutedTag}
              </span>
            )}
          </DropdownMenuItem>
          {muted && (
            <p role="status" className="px-2.5 pb-1.5 text-[0.85rem] italic leading-snug text-muted-foreground">
              {t.article.mutedNote}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
