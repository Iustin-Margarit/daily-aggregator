import { HEX_COLOR } from '@/lib/colors';
import { normalizeMutedKeyword } from '@/lib/validation';
import { UUID } from '@/lib/uuid';

/*
 * Visitors without an account can read the whole paper, clip stories and set
 * their preferences in Settings. Their muted newspapers and words, hidden
 * stories and accent ink are kept in cookies (so the server
 * prints their paper straight away), mirrored in the browser's storage
 * (lib/guest-prefs.ts); their clippings are in the browser's storage
 * (lib/guest-clippings.ts). Signing in moves them into the account.
 */

/** Cookie with a guest's muted newspapers: source ids, comma separated. */
export const GUEST_MUTED_PAPERS_COOKIE = 'guest-muted-papers';
/** Cookie with a guest's muted words, separated by '|' (a character a muted word cannot contain). */
export const GUEST_MUTED_WORDS_COOKIE = 'guest-muted-words';
/** Cookie with the stories a guest hid from their paper: article ids, comma separated, newest last. */
export const GUEST_HIDDEN_COOKIE = 'guest-hidden';
/** Cookie with a guest's accent ink (#RRGGBB). */
export const GUEST_ACCENT_COOKIE = 'guest-accent';

/** A guest may mute up to this many newspapers (there are about 35) and words (a cookie holds about 4 KB). */
export const GUEST_MAX_MUTED_PAPERS = 60;
export const GUEST_MAX_MUTED_WORDS = 30;
/** A guest keeps their 60 latest hidden stories (37 characters each: about 2.2 KB of cookie). */
export const GUEST_MAX_HIDDEN = 60;
/** The longest muted-words cookie value, so it stays well inside the browser's 4 KB per cookie. */
const MAX_WORDS_COOKIE_LENGTH = 3000;

/** A guest's muted newspapers and words, and the stories they hid (the feed functions leave all of them out). */
export type GuestMutes = { sourceIds: string[]; words: string[]; hiddenIds: string[] };


function uuidList(value: string | undefined | null, max: number): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((id) => id.trim()))].filter((id) => UUID.test(id)).slice(0, max);
}

/** The source ids in a guest-muted-papers cookie. */
export function parseGuestMutedPapers(value: string | undefined | null): string[] {
  return uuidList(value, GUEST_MAX_MUTED_PAPERS);
}

/** The article ids in a guest-hidden cookie (the newest kept when there are too many). */
export function parseGuestHidden(value: string | undefined | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((id) => id.trim()))].filter((id) => UUID.test(id)).slice(-GUEST_MAX_HIDDEN);
}

/** The words in a guest-muted-words cookie, each checked like a muted keyword of an account. */
export function parseGuestMutedWords(value: string | undefined | null): string[] {
  if (!value) return [];
  let text = value;
  try {
    // Next.js hands over cookies already decoded, document.cookie does not; a word never contains '%'.
    if (text.includes('%')) text = decodeURIComponent(text);
  } catch {
    return [];
  }
  const words = new Set<string>();
  for (const part of text.split('|')) {
    const result = normalizeMutedKeyword(part);
    if ('keyword' in result) words.add(result.keyword);
  }
  return [...words].slice(0, GUEST_MAX_MUTED_WORDS);
}

/** The cookie value for a list of muted words. */
export function serializeGuestMutedWords(words: string[]): string {
  return encodeURIComponent(words.join('|'));
}

/** True when the list still fits in its cookie. */
export function guestMutedWordsFit(words: string[]): boolean {
  return words.length <= GUEST_MAX_MUTED_WORDS && serializeGuestMutedWords(words).length <= MAX_WORDS_COOKIE_LENGTH;
}

/** A guest's accent ink from its cookie, or null. */
export function parseGuestAccent(value: string | undefined | null): string | null {
  return value && HEX_COLOR.test(value) ? value.toUpperCase() : null;
}

/** A guest's muted newspapers and words and hidden stories, from the request's (or the browser's) cookies. */
export function guestMutesFrom(getCookie: (name: string) => string | undefined): GuestMutes {
  return {
    sourceIds: parseGuestMutedPapers(getCookie(GUEST_MUTED_PAPERS_COOKIE)),
    words: parseGuestMutedWords(getCookie(GUEST_MUTED_WORDS_COOKIE)),
    hiddenIds: parseGuestHidden(getCookie(GUEST_HIDDEN_COOKIE)),
  };
}

/** True when a guest has nothing muted or hidden (their front page is then the same as every such visitor's). */
export function noGuestMutes(mutes: GuestMutes | undefined): boolean {
  return !mutes || (mutes.sourceIds.length === 0 && mutes.words.length === 0 && mutes.hiddenIds.length === 0);
}
