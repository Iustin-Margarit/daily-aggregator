import { useSyncExternalStore } from 'react';

const subscribeNever = () => () => {};

/** False during the server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

/**
 * A value only the browser knows, such as the reader's local date: `fallback`
 * on the server and during hydration, `read()` afterwards. `read` must return
 * a primitive (string, number, boolean) so repeated calls compare equal.
 */
export function useClientValue<T extends string | number | boolean | null>(read: () => T, fallback: T): T {
  return useSyncExternalStore(subscribeNever, read, () => fallback);
}
