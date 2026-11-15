/**
 * The edition a reader chooses: Morning (light, the default), Night (dark), or
 * By the clock, which prints the Night edition from NIGHT_FROM until NIGHT_UNTIL
 * by the reader's own clock and the Morning edition the rest of the day.
 * Kept in this browser (localStorage), like the other display choices.
 */
export type ThemeChoice = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'theme';
export const NIGHT_FROM = 19;
export const NIGHT_UNTIL = 7;

/** Paper colours for the browser's own bar (meta theme-color). */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#efe6d6', dark: '#141a26' };

/** A stored value, read safely; 'system' was "Like my device" before it became By the clock. */
export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  if (value === 'dark' || value === 'auto') return value;
  if (value === 'system') return 'auto';
  return 'light';
}

export const isNightHour = (hour: number) => hour >= NIGHT_FROM || hour < NIGHT_UNTIL;

/** The edition printed at a given hour of the reader's day. */
export function resolveAt(choice: ThemeChoice, hour: number): ResolvedTheme {
  return choice === 'dark' || (choice === 'auto' && isNightHour(hour)) ? 'dark' : 'light';
}

/**
 * Runs in <head> before the first paint, so the page never flashes the wrong edition.
 * Kept in step with parseThemeChoice and resolveAt above.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});var h=new Date().getHours();var d=t==='dark'||((t==='auto'||t==='system')&&(h>=${NIGHT_FROM}||h<${NIGHT_UNTIL}));var c=document.documentElement;c.classList.remove('light','dark');c.classList.add(d?'dark':'light');c.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
