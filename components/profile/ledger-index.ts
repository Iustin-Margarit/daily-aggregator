/**
 * The Reader's Ledger (the Settings page): its entries in order, for the
 * contents column and each entry's heading. The titles are
 * settings.entries.<id> in lib/i18n/en.ts. Visitors without
 * an account see only the entries kept in their browser, numbered I to III.
 */
const ENTRIES = ['byline', 'printing', 'reading-room', 'muted', 'close'] as const;
const GUEST_ENTRIES = ['printing', 'reading-room', 'muted'] as const;
const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export type LedgerEntryId = (typeof ENTRIES)[number];
export type LedgerIndex = { id: LedgerEntryId; numeral: string }[];

export function ledgerIndex(guest: boolean): LedgerIndex {
  return (guest ? GUEST_ENTRIES : ENTRIES).map((id, index) => ({ id, numeral: NUMERALS[index] }));
}
