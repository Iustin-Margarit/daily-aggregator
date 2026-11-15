import { accentVariables } from '@/lib/colors';
import {
  GUEST_ACCENT_COOKIE,
  GUEST_MUTED_PAPERS_COOKIE,
  GUEST_MUTED_WORDS_COOKIE,
  guestMutesFrom,
  parseGuestAccent,
  parseGuestMutedPapers,
  parseGuestMutedWords,
  serializeGuestMutedWords,
  type GuestMutes,
} from '@/lib/guest';
import type { FontSize } from '@/lib/types';

/*
 * Settings in the browser (client code only). The cookies are what the server
 * reads to print the page the reader's way before any script runs; the same
 * values are mirrored in localStorage, which brings back a cookie the browser
 * dropped and tells the account, once a visitor signs in, what they chose
 * (components/site/guest-prefs-keeper.tsx).
 */

/** The page's paper (app/(main)/layout.tsx), which carries the accent ink's CSS variables. */
export const PAPER_ID = 'paper';
const MIRROR_KEY = 'guest-prefs';
const YEAR = 60 * 60 * 24 * 365;
const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

/** What a visitor chose, as kept in localStorage. */
export type GuestMirror = {
  fontSize?: FontSize;
  accent?: string;
  mutedPapers?: string[];
  mutedWords?: string[];
};

export function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function writeCookie(name: string, value: string | null) {
  document.cookie =
    value === null || value === '' ? `${name}=; path=/; max-age=0; samesite=lax` : `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
}

/** The visitor's choices in localStorage (empty when storage is blocked or holds something else). */
export function readGuestMirror(): GuestMirror {
  try {
    const raw = JSON.parse(localStorage.getItem(MIRROR_KEY) ?? '{}') as Record<string, unknown>;
    const out: GuestMirror = {};
    if (typeof raw.fontSize === 'string' && FONT_SIZES.includes(raw.fontSize as FontSize)) out.fontSize = raw.fontSize as FontSize;
    const accent = parseGuestAccent(typeof raw.accent === 'string' ? raw.accent : null);
    if (accent) out.accent = accent;
    if (Array.isArray(raw.mutedPapers)) out.mutedPapers = parseGuestMutedPapers(raw.mutedPapers.join(','));
    if (Array.isArray(raw.mutedWords)) out.mutedWords = parseGuestMutedWords(raw.mutedWords.join('|'));
    return out;
  } catch {
    return {};
  }
}

function updateMirror(change: GuestMirror) {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify({ ...readGuestMirror(), ...change }));
  } catch {
    // Storage blocked (private window): the cookies still carry the choice.
  }
}

/** True when this browser holds choices a visitor made. */
export function hasGuestMirror(): boolean {
  const mirror = readGuestMirror();
  return Boolean(mirror.fontSize || mirror.accent || mirror.mutedPapers?.length || mirror.mutedWords?.length);
}

/** Forgets the visitor's choices (once they are in the account). The type size cookie stays: it is the page's. */
export function clearGuestPrefs() {
  try {
    localStorage.removeItem(MIRROR_KEY);
  } catch {
    // nothing kept
  }
  writeCookie(GUEST_MUTED_PAPERS_COOKIE, null);
  writeCookie(GUEST_MUTED_WORDS_COOKIE, null);
  writeCookie(GUEST_ACCENT_COOKIE, null);
}

// ------------------------------------------------------------ type size and ink

/** Prints the page in a type size at once and keeps it in the font-size cookie (read by app/layout.tsx). */
export function applyFontSize(size: FontSize) {
  document.documentElement.dataset.fontSize = size;
  writeCookie('font-size', size);
}

/** Prints the page's section labels in an ink at once. */
export function applyAccent(hex: string) {
  const paper = document.getElementById(PAPER_ID);
  if (!paper) return;
  for (const [name, value] of Object.entries(accentVariables(hex))) paper.style.setProperty(name, String(value));
}

export function saveGuestFontSize(size: FontSize) {
  applyFontSize(size);
  updateMirror({ fontSize: size });
}

export function saveGuestAccent(hex: string) {
  applyAccent(hex);
  writeCookie(GUEST_ACCENT_COOKIE, hex);
  updateMirror({ accent: hex });
}

// ------------------------------------------------------------ muted newspapers and words

/** The visitor's muted newspapers and words, from this browser's cookies. */
export function readGuestMutes(): GuestMutes {
  return guestMutesFrom(readCookie);
}

export function saveGuestMutes({ sourceIds, words }: GuestMutes) {
  writeCookie(GUEST_MUTED_PAPERS_COOKIE, sourceIds.join(','));
  writeCookie(GUEST_MUTED_WORDS_COOKIE, words.length ? serializeGuestMutedWords(words) : null);
  updateMirror({ mutedPapers: sourceIds, mutedWords: words });
}

/**
 * Puts back cookies the browser dropped while localStorage kept the choice.
 * True when something was put back (the page should then be printed again).
 */
export function restoreGuestCookies(): boolean {
  const mirror = readGuestMirror();
  let restored = false;
  if (mirror.fontSize && !readCookie('font-size')) {
    applyFontSize(mirror.fontSize);
    restored = true;
  }
  if (mirror.accent && !readCookie(GUEST_ACCENT_COOKIE)) {
    writeCookie(GUEST_ACCENT_COOKIE, mirror.accent);
    applyAccent(mirror.accent);
    restored = true;
  }
  const mutes = readGuestMutes();
  if (mirror.mutedPapers?.length && mutes.sourceIds.length === 0) {
    writeCookie(GUEST_MUTED_PAPERS_COOKIE, mirror.mutedPapers.join(','));
    restored = true;
  }
  if (mirror.mutedWords?.length && mutes.words.length === 0) {
    writeCookie(GUEST_MUTED_WORDS_COOKIE, serializeGuestMutedWords(mirror.mutedWords));
    restored = true;
  }
  return restored;
}
