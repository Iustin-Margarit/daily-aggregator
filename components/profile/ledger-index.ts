/** The Reader's Ledger (the Settings page): its entries in order, for the contents column and each entry's heading. */
export const LEDGER_INDEX = [
  { id: 'byline', numeral: 'I', title: 'Your byline' },
  { id: 'printing', numeral: 'II', title: 'The printing' },
  { id: 'reading-room', numeral: 'III', title: 'The reading room' },
  { id: 'sections', numeral: 'IV', title: 'Sections & papers' },
  { id: 'signing-in', numeral: 'V', title: 'Signing in' },
  { id: 'close', numeral: 'VI', title: 'Closing the account' },
] as const;

export type LedgerEntryId = (typeof LEDGER_INDEX)[number]['id'];
