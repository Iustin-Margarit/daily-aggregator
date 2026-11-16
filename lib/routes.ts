/**
 * The paper's addresses, in one place. Older names redirect for good
 * (next.config.mjs): `/feed` (the front page until V2), `/onboarding` and
 * `/profile` (Sections and Settings; old confirmation emails still link to
 * `/auth/callback?next=/onboarding`).
 */
export const FRONT_PATH = '/';
export const LATEST_PATH = '/latest';
export const SECTIONS_PATH = '/sections';
export const SETTINGS_PATH = '/settings';
export const SEARCH_PATH = '/search';
export const SECTION_PREFIX = '/section/';
export const PAPER_PREFIX = '/paper/';
/** Log in, which is also where a new reader's account is made: Continue with Google. */
export const LOGIN_PATH = '/login';

/** The address part of a section's name: "World" -> "world". */
export function sectionSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

export function sectionPath(name: string): string {
  return `${SECTION_PREFIX}${encodeURIComponent(sectionSlug(name))}`;
}

/** The address part of a newspaper's name: "The Guardian - World" -> "the-guardian-world". */
export function paperSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function paperPath(name: string): string {
  return `${PAPER_PREFIX}${paperSlug(name)}`;
}

/** A story's address: pressed in the paper it opens the quick-read sheet over the page; opened directly, over the front page. */
export function storyPath(slug: string): string {
  return `/article/${slug}`;
}

export function searchPath(query: string): string {
  return query ? `${SEARCH_PATH}?q=${encodeURIComponent(query)}` : SEARCH_PATH;
}

/** True on a page that prints the paper itself (the front page, the latest, one section or newspaper, a search). */
export function isPaperPath(pathname: string): boolean {
  return pathname === FRONT_PATH || pathname === LATEST_PATH || pathname === SEARCH_PATH || pathname.startsWith(SECTION_PREFIX) || pathname.startsWith(PAPER_PREFIX);
}
