import { HEX_COLOR } from '@/lib/colors';
import { normalizeMutedKeyword } from '@/lib/validation';
import { UUID } from '@/lib/uuid';

/*
 * Visitors without an account can read the whole paper, choose their sections,
 * clip stories and set their preferences in Settings. Their sections, muted
 * newspapers and words and accent ink are kept in cookies (so the server
 * prints their paper straight away), mirrored in the browser's storage
 * (lib/guest-prefs.ts); their clippings are in the browser's storage
 * (lib/guest-clippings.ts). Signing in moves them into the account.
 */

/** Cookie with a guest's chosen sections: category ids, comma separated. */
export const GUEST_SECTIONS_COOKIE = 'guest-sections';
/** Cookie with a guest's muted newspapers: source ids, comma separated. */
export const GUEST_MUTED_PAPERS_COOKIE = 'guest-muted-papers';
/** Cookie with a guest's muted words, separated by '|' (a character a muted word cannot contain). */
export const GUEST_MUTED_WORDS_COOKIE = 'guest-muted-words';
/** Cookie with a guest's accent ink (#RRGGBB). */
export const GUEST_ACCENT_COOKIE = 'guest-accent';

/** A guest may mute up to this many newspapers (there are about 35) and words (a cookie holds about 4 KB). */
export const GUEST_MAX_MUTED_PAPERS = 60;
export const GUEST_MAX_MUTED_WORDS = 30;
/** The longest muted-words cookie value, so it stays well inside the browser's 4 KB per cookie. */
const MAX_WORDS_COOKIE_LENGTH = 3000;

export type GuestMutes = { sourceIds: string[]; words: string[] };


function uuidList(value: string | undefined | null, max: number): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((id) => id.trim()))].filter((id) => UUID.test(id)).slice(0, max);
}

/** The category ids in a guest-sections cookie (invalid entries are dropped). */
export function parseGuestSections(value: string | undefined | null): string[] {
  return uuidList(value, 50);
}

/** The source ids in a guest-muted-papers cookie. */
export function parseGuestMutedPapers(value: string | undefined | null): string[] {
  return uuidList(value, GUEST_MAX_MUTED_PAPERS);
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

/** A guest's muted newspapers and words, from the request's (or the browser's) cookies. */
export function guestMutesFrom(getCookie: (name: string) => string | undefined): GuestMutes {
  return {
    sourceIds: parseGuestMutedPapers(getCookie(GUEST_MUTED_PAPERS_COOKIE)),
    words: parseGuestMutedWords(getCookie(GUEST_MUTED_WORDS_COOKIE)),
  };
}
