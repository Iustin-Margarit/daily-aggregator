'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useArticleActions } from '@/components/articles/use-article-actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n/client';
import { SEARCH_PATH } from '@/lib/routes';
import { printedStory } from '@/lib/story-cache';
import type { FeedArticle } from '@/lib/types';

/** The footer's "Press ? for the keys" button opens the card with this event. */
export const KEYS_CARD_EVENT = 'paper:keys-card';

/** Typing in a box: the keys are the reader's letters, not commands. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(target.type);
}

/** The headlines on the page, top to bottom, once per story (the lead's "Read dispatch" is the same story). */
function storyLinks(): HTMLAnchorElement[] {
  const seen = new Set<string>();
  return [...document.querySelectorAll<HTMLAnchorElement>('main a[data-story-link]')].filter((link) => {
    const slug = link.dataset.storyLink ?? '';
    if (seen.has(slug) || link.getClientRects().length === 0) return false;
    seen.add(slug);
    return true;
  });
}

/** The story a link belongs to (its card, its headline line). */
function storyOf(link: HTMLElement): HTMLElement {
  return link.closest('article') ?? link;
}

/**
 * Reading the paper with the keyboard, on every page of it: j / k go to the next / previous story
 * (its headline takes the focus, so Enter opens it in the quick-read sheet), s saves it or takes it
 * out of the saved stories (in the open sheet too; on the Saved page it removes the clipping, with
 * Undo), / goes to the search box, Esc lets go of the story (and closes the sheet or the card, as
 * they always did), ? shows the compositor's card of keys. Nothing happens while the reader types
 * in a box or holds Ctrl, Alt or Cmd, nor while a menu is open.
 */
export function KeyboardReading({ userId }: { userId: string | null }) {
  const router = useRouter();
  const [cardOpen, setCardOpen] = useState(false);
  // The story the keys are on, for "s" where its card has no Save button of its own (headline lines, digests).
  const [target, setTarget] = useState<FeedArticle | null>(null);
  const saverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let marked: HTMLElement | null = null;
    let slug: string | null = null;

    const unmark = () => {
      marked?.removeAttribute('data-reading');
      marked = null;
    };

    const goTo = (link: HTMLAnchorElement) => {
      unmark();
      const story = storyOf(link);
      story.setAttribute('data-reading', '');
      marked = story;
      slug = link.dataset.storyLink ?? null;
      setTarget(slug ? printedStory(slug) : null);
      link.focus({ preventScroll: true });
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      story.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
    };

    /** Where the keys are: the headline in focus, else the story marked last (if it is still on the page). */
    const currentIndex = (links: HTMLAnchorElement[]) => {
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLAnchorElement>('a[data-story-link]') : null;
      const at = focused?.dataset.storyLink ?? slug;
      return at ? links.findIndex((link) => link.dataset.storyLink === at) : -1;
    };

    const move = (step: 1 | -1) => {
      const links = storyLinks();
      if (links.length === 0) return;
      const index = currentIndex(links);
      if (index >= 0) {
        goTo(links[Math.min(links.length - 1, Math.max(0, index + step))]);
        return;
      }
      // Not on a story yet: start from what is on screen (j: the first story whose middle is still on screen; k: the last).
      const middle = (link: HTMLAnchorElement) => {
        const box = storyOf(link).getBoundingClientRect();
        return (box.top + box.bottom) / 2;
      };
      const firstShown = links.find((link) => middle(link) >= 0);
      const lastShown = links.findLast((link) => middle(link) <= window.innerHeight);
      goTo((step === 1 ? firstShown : lastShown) ?? links[0]);
    };

    const save = () => {
      const links = storyLinks();
      const index = currentIndex(links);
      if (index < 0) return;
      // A card's own Save button (it plays its stamp; on the Saved page, Remove); else the shared saver.
      const button = storyOf(links[index]).querySelector<HTMLButtonElement>('[data-save-button]');
      if (button) {
        if (!button.disabled) button.click();
        return;
      }
      saverRef.current?.();
    };

    const search = () => {
      const field = document.querySelector<HTMLInputElement>('main form[role="search"] input');
      if (field) {
        field.focus();
        field.select();
      } else {
        router.push(SEARCH_PATH);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || isTyping(event.target)) return;
      if (document.querySelector('[role="menu"]')) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog) {
        // In the quick-read sheet, "s" saves its story; everything else is the sheet's (Esc closes it).
        if (key === 's' && dialog.classList.contains('quick-read')) {
          const button = dialog.querySelector<HTMLButtonElement>('[data-save-button]');
          if (button && !button.disabled) {
            event.preventDefault();
            button.click();
          }
        }
        return;
      }
      if (key === 'j') move(1);
      else if (key === 'k') move(-1);
      else if (key === 's') save();
      else if (key === '/') search();
      else if (key === '?') setCardOpen(true);
      else if (key === 'Escape' && marked) {
        unmark();
        slug = null;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      } else return;
      event.preventDefault();
    };

    // Pointing somewhere puts the keys down: the mark goes until j / k again.
    const onPointer = () => {
      unmark();
      slug = null;
    };
    const openCard = () => setCardOpen(true);

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener(KEYS_CARD_EVENT, openCard);
    return () => {
      unmark();
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener(KEYS_CARD_EVENT, openCard);
    };
  }, [router]);

  return (
    <>
      {target && <StorySaver key={target.id} article={target} userId={userId} saverRef={saverRef} />}
      <KeysCard open={cardOpen} onOpenChange={setCardOpen} />
    </>
  );
}

/** Saves (or un-saves) the story the keys are on, with the same toasts as its Save button. */
function StorySaver({ article, userId, saverRef }: { article: FeedArticle; userId: string | null; saverRef: React.RefObject<(() => void) | null> }) {
  const { toggleSave } = useArticleActions(article, userId);
  useEffect(() => {
    saverRef.current = () => void toggleSave();
    return () => {
      saverRef.current = null;
    };
  });
  return null;
}

/** The compositor's card: the keys, each a round typewriter key, and what it does. */
function KeysCard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const k = t.keys;
  const rows: [string[], string][] = [
    [['J'], k.next],
    [['K'], k.previous],
    [[k.enter], k.open],
    [['S'], k.save],
    [['/'], k.search],
    [[k.esc], k.close],
    [['?'], k.help],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{k.title}</DialogTitle>
          <DialogDescription className="text-[0.95rem]">{k.intro}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-rule/30 border-y border-rule/40">
          {rows.map(([keys, what]) => (
            <div key={what} className="flex items-center gap-4 py-2.5">
              <dt className="flex w-20 shrink-0 justify-center">
                {keys.map((name) => (
                  <kbd key={name} className="type-key">
                    {name}
                  </kbd>
                ))}
              </dt>
              <dd className="text-[1rem] leading-snug">{what}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/** The footer's quiet way to the card, for readers with a keyboard and mouse (hidden on touch screens). */
export function KeysCardButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(KEYS_CARD_EVENT))}
      className="hidden font-label text-[0.82rem] text-muted-foreground underline decoration-(--ink-gold)/50 underline-offset-4 hover:text-foreground pointer-fine:inline"
    >
      {label}
    </button>
  );
}
