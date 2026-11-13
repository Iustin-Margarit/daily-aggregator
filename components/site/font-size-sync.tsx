'use client';

import { useEffect } from 'react';

/** Applies the account's font size (e.g. after logging in on a new device). */
export function FontSizeSync({ value }: { value: string }) {
  useEffect(() => {
    document.documentElement.dataset.fontSize = value;
    if (!document.cookie.split('; ').includes(`font-size=${value}`)) {
      document.cookie = `font-size=${value}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [value]);
  return null;
}
