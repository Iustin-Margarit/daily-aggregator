/**
 * The words under a failed action (a toast's second line). The reader gets
 * plain words in their edition; the technical reason (a database or network
 * message, always in English) goes to the console for whoever is debugging.
 * The one cause a reader can do something about, a browser that refuses to
 * store a visitor's things, is named.
 */
export function errorText(
  error: { message: string; code?: string },
  t: { common: { storageBlocked: string; errorNote: string } },
): string {
  if (error.message === 'STORAGE_BLOCKED') return t.common.storageBlocked;
  console.warn('[action failed]', error.code ?? '', error.message);
  return t.common.errorNote;
}
