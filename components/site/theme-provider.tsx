'use client';

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { parseThemeChoice, resolveAt, THEME_COLORS, THEME_KEY, type ResolvedTheme, type ThemeChoice } from '@/lib/theme';

type ThemeContextValue = {
  /** The reader's choice; undefined until the page has hydrated (it lives in the browser). */
  theme: ThemeChoice | undefined;
  /** The edition actually printed now. */
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (choice: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The choice, as a tiny store over localStorage that also follows other tabs.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
// Where storage is refused (some private windows), the choice lasts for this page.
let unsaved: ThemeChoice | null = null;
function readChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_KEY));
  } catch {
    return unsaved ?? 'light';
  }
}
function subscribeChoice(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// The hour, checked each minute (and when the tab comes back), so By the clock turns the page at dusk and dawn.
function subscribeHour(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  document.addEventListener('visibilitychange', listener);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', listener);
  };
}
const readHour = () => new Date().getHours();

/** Prints the page as the chosen edition: the class on <html> and the browser bar's colour. */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  // Switch editions in one stroke, without every colour fading at its own pace.
  const still = document.createElement('style');
  still.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(still);
  root.classList.remove(resolved === 'dark' ? 'light' : 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', THEME_COLORS[resolved]));
  void getComputedStyle(document.body).opacity;
  window.setTimeout(() => still.remove(), 1);
}

/** The Morning or Night edition (lib/theme.ts); the first paint is set by THEME_SCRIPT in the layout's <head>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => undefined);
  const hour = useSyncExternalStore(subscribeHour, readHour, () => undefined);
  const resolved = choice === undefined || hour === undefined ? undefined : resolveAt(choice, hour);

  useEffect(() => {
    if (resolved) applyTheme(resolved);
  }, [resolved]);

  const setTheme = (next: string) => {
    unsaved = parseThemeChoice(next);
    try {
      localStorage.setItem(THEME_KEY, unsaved);
    } catch {
      // Kept in memory instead (unsaved).
    }
    emit();
  };

  return <ThemeContext.Provider value={{ theme: choice, resolvedTheme: resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
