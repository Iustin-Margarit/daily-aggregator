import type { EngravingName } from '@/components/site/engraving';

export type CategoryStyle = {
  /** Key of the section's muted ink in styles/globals.css (`data-section`); null for unknown sections. */
  key: string | null;
  /** Public-domain engraving that illustrates the section (public/engravings). */
  engraving: EngravingName;
};

/*
 * The sections' names and descriptions are in the dictionary:
 * sections.<key> in lib/i18n/en.ts (sectionText() in lib/i18n).
 */

const STYLES: Record<string, CategoryStyle> = {
  world: {
    key: 'world',
    engraving: 'world',
  },
  politics: {
    key: 'politics',
    engraving: 'politics',
  },
  business: {
    key: 'business',
    engraving: 'business',
  },
  technology: {
    key: 'technology',
    engraving: 'technology',
  },
  science: {
    key: 'science',
    engraving: 'science',
  },
  health: {
    key: 'health',
    engraving: 'health',
  },
  sports: {
    key: 'sports',
    engraving: 'sports',
  },
  entertainment: {
    key: 'entertainment',
    engraving: 'entertainment',
  },
};

const FALLBACK: CategoryStyle = {
  key: null,
  engraving: 'press',
};

export function getCategoryStyle(name: string | null | undefined): CategoryStyle {
  if (!name) return FALLBACK;
  return STYLES[name.trim().toLowerCase()] ?? FALLBACK;
}
