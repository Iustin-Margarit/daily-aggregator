import {
  Briefcase,
  Clapperboard,
  Cpu,
  FlaskConical,
  Globe,
  HeartPulse,
  Landmark,
  Newspaper,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { EngravingName } from '@/components/site/engraving';

export type CategoryStyle = {
  /** Key of the section's muted ink in styles/globals.css (`data-section`); null for unknown sections. */
  key: string | null;
  icon: LucideIcon;
  /** Public-domain engraving that illustrates the section (public/engravings). */
  engraving: EngravingName;
};

/*
 * The sections' names and descriptions are in the reader's language:
 * sections.<key> in lib/i18n/dictionaries (sectionText() in lib/i18n).
 */

const STYLES: Record<string, CategoryStyle> = {
  world: {
    key: 'world',
    icon: Globe,
    engraving: 'world',
  },
  politics: {
    key: 'politics',
    icon: Landmark,
    engraving: 'politics',
  },
  business: {
    key: 'business',
    icon: Briefcase,
    engraving: 'business',
  },
  technology: {
    key: 'technology',
    icon: Cpu,
    engraving: 'technology',
  },
  science: {
    key: 'science',
    icon: FlaskConical,
    engraving: 'science',
  },
  health: {
    key: 'health',
    icon: HeartPulse,
    engraving: 'health',
  },
  sports: {
    key: 'sports',
    icon: Trophy,
    engraving: 'sports',
  },
  entertainment: {
    key: 'entertainment',
    icon: Clapperboard,
    engraving: 'entertainment',
  },
};

const FALLBACK: CategoryStyle = {
  key: null,
  icon: Newspaper,
  engraving: 'press',
};

export function getCategoryStyle(name: string | null | undefined): CategoryStyle {
  if (!name) return FALLBACK;
  return STYLES[name.trim().toLowerCase()] ?? FALLBACK;
}
