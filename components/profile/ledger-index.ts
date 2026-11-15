/**
 * The Reader's Ledger (the Settings page): its entries in order, for the
 * contents column and each entry's heading. The titles are in the reader's
 * language: settings.entries.<id> in lib/i18n/dictionaries. Visitors without
 * an account see only the entries kept in their browser, numbered I to III.
 */
const ENTRIES = ['byline', 'printing', 'reading-room', 'sections', 'signing-in', 'close'] as const;
const GUEST_ENTRIES = ['printing', 'reading-room', 'sections'] as const;
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export type LedgerEntryId = (typeof ENTRIES)[number];
export type LedgerIndex = { id: LedgerEntryId; numeral: string }[];

export function ledgerIndex(guest: boolean): LedgerIndex {
  return (guest ? GUEST_ENTRIES : ENTRIES).map((id, index) => ({ id, numeral: NUMERALS[index] }));
}
