/*
 * Visitors without an account can read the whole paper, choose their sections
 * and clip stories. Their sections are kept in a cookie (so the server prints
 * their paper straight away) and their clippings in the browser's storage
 * (lib/guest-clippings.ts). Signing in moves both into the account.
 */

/** Cookie with a guest's chosen sections: category ids, comma separated. */
export const GUEST_SECTIONS_COOKIE = 'guest-sections';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The category ids in a guest-sections cookie (invalid entries are dropped). */
export function parseGuestSections(value: string | undefined | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((id) => id.trim()))].filter((id) => UUID.test(id)).slice(0, 50);
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
