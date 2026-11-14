import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { translator, type Translator } from '@/lib/i18n';

/** The reader's edition from the cookie (read once per request); English when it is missing or unknown. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** The translation kit for server components, server actions and metadata. */
export async function getI18n(): Promise<Translator> {
  return translator(await getLocale());
}
