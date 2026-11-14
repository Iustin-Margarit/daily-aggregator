'use client';

import { createContext, useContext, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { isLocale, LOCALE_COOKIE, LOCALE_INFO, LOCALE_STORAGE_KEY, type Locale } from '@/lib/i18n/config';
import { translator, type Translator } from '@/lib/i18n';

const LocaleContext = createContext<Locale>('en');

function hasLocaleCookie() {
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${LOCALE_COOKIE}=`));
}

function writeLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be blocked (private windows); the cookie is enough.
  }
  document.documentElement.lang = LOCALE_INFO[locale].htmlLang;
}

/**
 * Hands the edition the server printed (from the cookie) to every client
 * component. The choice is mirrored in localStorage; if the cookie has gone
 * (cleared, or expired after a year) but the browser still remembers an
 * edition, it is put back and the page reprinted in it.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (!hasLocaleCookie()) {
        if (isLocale(stored) && stored !== locale) {
          writeLocale(stored);
          router.refresh();
        }
        return;
      }
      if (stored !== locale) window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // No storage: nothing to restore.
    }
  }, [locale, router]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The translation kit for client components: `const { t, fmt, plural } = useI18n()`. */
export function useI18n(): Translator {
  return translator(useContext(LocaleContext));
}

/**
 * Changes the edition on this device: the cookie and localStorage keep it, and
 * the page is reprinted from the server in the new language (client state such
 * as the page of stories you are on stays as it is).
 */
export function useChangeLocale() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (next: Locale) => {
    writeLocale(next);
    startTransition(() => router.refresh());
  };
  return { change, pending };
}
