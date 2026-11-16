'use client';

import { useSyncExternalStore } from 'react';
import { prefCookieName, prefFallback, READER_PREFS, type ReaderPref, type ReaderPrefValue } from '@/lib/reader-prefs';

const EVENT = 'reader-pref-change';

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

function current<K extends ReaderPref>(name: K): ReaderPrefValue<K> {
  const value = document.documentElement.dataset[name];
  return ((READER_PREFS[name].values as readonly string[]).includes(value ?? '') ? value : prefFallback(name)) as ReaderPrefValue<K>;
}

/** Changes a reading preference on this device: the page follows at once and the cookie keeps it for next time. */
export function setReaderPref<K extends ReaderPref>(name: K, value: ReaderPrefValue<K>) {
  document.documentElement.dataset[name] = value;
  document.cookie = `${prefCookieName(name)}=${value}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(EVENT));
}

/**
 * A reading preference (lib/reader-prefs.ts). The server already printed it on
 * <html>; during hydration this returns the default, then the real value.
 * Styling should use the html attribute; use this for labels and text.
 */
export function useReaderPref<K extends ReaderPref>(name: K): ReaderPrefValue<K> {
  return useSyncExternalStore(
    subscribe,
    () => current(name),
    () => prefFallback(name),
  );
}
