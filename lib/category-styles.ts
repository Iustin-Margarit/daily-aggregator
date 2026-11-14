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
  description: string;
};

const STYLES: Record<string, CategoryStyle> = {
  world: {
    key: 'world',
    icon: Globe,
    engraving: 'world',
    description: 'International news and global affairs',
  },
  politics: {
    key: 'politics',
    icon: Landmark,
    engraving: 'politics',
    description: 'Elections, policy and government',
  },
  business: {
    key: 'business',
    icon: Briefcase,
    engraving: 'business',
    description: 'Markets, companies and the economy',
  },
  technology: {
    key: 'technology',
    icon: Cpu,
    engraving: 'technology',
    description: 'Gadgets, software, AI and startups',
  },
  science: {
    key: 'science',
    icon: FlaskConical,
    engraving: 'science',
    description: 'Space, research and discoveries',
  },
  health: {
    key: 'health',
    icon: HeartPulse,
    engraving: 'health',
    description: 'Medicine, wellbeing and public health',
  },
  sports: {
    key: 'sports',
    icon: Trophy,
    engraving: 'sports',
    description: 'Football, basketball, tennis and more',
  },
  entertainment: {
    key: 'entertainment',
    icon: Clapperboard,
    engraving: 'entertainment',
    description: 'Film, TV, music and celebrities',
  },
};

const FALLBACK: CategoryStyle = {
  key: null,
  icon: Newspaper,
  engraving: 'press',
  description: 'News and stories',
};

export function getCategoryStyle(name: string | null | undefined): CategoryStyle {
  if (!name) return FALLBACK;
  return STYLES[name.trim().toLowerCase()] ?? FALLBACK;
}
