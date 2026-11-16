import 'server-only';
import { i18n, type Translator } from '@/lib/i18n';

/** The paper's words and their kit for server components, server actions and metadata (lib/i18n). */
export async function getI18n(): Promise<Translator> {
  return i18n;
}
