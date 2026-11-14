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

export const USERNAME_RESERVED_MESSAGE = 'That username is reserved. Please choose another one.';

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

export function validateUsername(value: string): string | null {
  if (value.length < 3) return 'Usernames need at least 3 characters.';
  if (value.length > 30) return 'Usernames can have at most 30 characters.';
  if (!USERNAME_PATTERN.test(value)) return 'Use only letters, numbers, dots, dashes and underscores.';
  return null;
}

/** Friendly text for the errors the database raises when saving a profile. */
export function profileSaveError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === '23505') return 'That username is already taken.';
  if (error.message.includes('USERNAME_RESERVED')) return USERNAME_RESERVED_MESSAGE;
  return fallback;
}

/** Most muted words a reader can keep (the database allows 50). */
export const MAX_MUTED_KEYWORDS = 50;
const MUTED_KEYWORD_PATTERN = /^[\p{L}\p{N}]([\p{L}\p{N} '’&.-]*[\p{L}\p{N}])?$/u;

/**
 * A muted keyword as the database stores it (lower case, single spaces), or the
 * reason it cannot be used. Matches the check on public.muted_keywords.
 */
export function normalizeMutedKeyword(input: string): { keyword: string } | { error: string } {
  const keyword = input.trim().replace(/\s+/g, ' ').toLowerCase();
  if (keyword.length < 2) return { error: 'Type a word of at least 2 letters.' };
  if (keyword.length > 40) return { error: 'Keep it to 40 characters or fewer.' };
  if (!MUTED_KEYWORD_PATTERN.test(keyword)) return { error: 'Use letters and numbers (spaces, - and apostrophes are fine inside).' };
  return { keyword };
}
