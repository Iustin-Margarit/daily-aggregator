/**
 * The Reader's Ledger (the Settings page): its entries in order, for the
 * contents column and each entry's heading. The titles are in the reader's
 * language: settings.entries.<id> in lib/i18n/dictionaries.
 */
export const LEDGER_INDEX = [
  { id: 'byline', numeral: 'I' },
  { id: 'printing', numeral: 'II' },
  { id: 'reading-room', numeral: 'III' },
  { id: 'sections', numeral: 'IV' },
  { id: 'signing-in', numeral: 'V' },
  { id: 'close', numeral: 'VI' },
] as const;

export type LedgerEntryId = (typeof LEDGER_INDEX)[number]['id'];
