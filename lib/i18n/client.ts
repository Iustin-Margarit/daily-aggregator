import { i18n, type Translator } from '@/lib/i18n';

/** The paper's words and their kit for client components: `const { t, fmt, plural } = useI18n()` (lib/i18n). */
export function useI18n(): Translator {
  return i18n;
}
