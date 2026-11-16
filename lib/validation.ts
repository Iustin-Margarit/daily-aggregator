import en, { type Dictionary } from '@/lib/i18n/en';

/** The messages below, from the dictionary (lib/i18n). */
type Messages = Dictionary['validation'];

export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;

/**
 * Names that could be used to pose as staff. The database enforces the same
 * list (public.is_reserved_username); this copy only gives a faster answer.
 */
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'editor', 'editors', 'theeditor', 'editorinchief',
  'staff', 'support', 'help', 'security', 'system', 'root', 'owner', 'official',
  'newsroom', 'dailyaggregator', 'thedailyaggregator',
]);

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

export function validateUsername(value: string, m: Messages = en.validation): string | null {
  if (value.length < 3) return m.usernameShort;
  if (value.length > 30) return m.usernameLong;
  if (!USERNAME_PATTERN.test(value)) return m.usernameChars;
  return null;
}

/** Friendly text for the errors the database raises when saving a profile. */
export function profileSaveError(error: { code?: string; message: string }, fallback: string, m: Messages = en.validation): string {
  if (error.code === '23505') return m.usernameTaken;
  if (error.message.includes('USERNAME_RESERVED')) return m.usernameReserved;
  return fallback;
}

/** Most muted words a reader can keep (the database allows 50). */
export const MAX_MUTED_KEYWORDS = 50;
const MUTED_KEYWORD_PATTERN = /^[\p{L}\p{N}]([\p{L}\p{N} '’&.-]*[\p{L}\p{N}])?$/u;

/**
 * A muted keyword as the database stores it (lower case, single spaces), or the
 * reason it cannot be used. Matches the check on public.muted_keywords.
 */
export function normalizeMutedKeyword(input: string, m: Messages = en.validation): { keyword: string } | { error: string } {
  const keyword = input.trim().replace(/\s+/g, ' ').toLowerCase();
  if (keyword.length < 2) return { error: m.wordShort };
  if (keyword.length > 40) return { error: m.wordLong };
  if (!MUTED_KEYWORD_PATTERN.test(keyword)) return { error: m.wordChars };
  return { keyword };
}
