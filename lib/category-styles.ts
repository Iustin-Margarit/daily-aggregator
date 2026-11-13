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

export type CategoryStyle = {
  icon: LucideIcon;
  /** Badge colours for light and dark mode. */
  badge: string;
  /** Gradient used when an article has no image. */
  placeholder: string;
  description: string;
};

// Full class names are spelled out so Tailwind can find them.
const STYLES: Record<string, CategoryStyle> = {
  world: {
    icon: Globe,
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
    placeholder: 'from-sky-500 to-cyan-700',
    description: 'International news and global affairs',
  },
  politics: {
    icon: Landmark,
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300',
    placeholder: 'from-indigo-500 to-violet-700',
    description: 'Elections, policy and government',
  },
  business: {
    icon: Briefcase,
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
    placeholder: 'from-emerald-500 to-teal-700',
    description: 'Markets, companies and the economy',
  },
  technology: {
    icon: Cpu,
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300',
    placeholder: 'from-blue-500 to-indigo-700',
    description: 'Gadgets, software, AI and startups',
  },
  science: {
    icon: FlaskConical,
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300',
    placeholder: 'from-violet-500 to-purple-700',
    description: 'Space, research and discoveries',
  },
  health: {
    icon: HeartPulse,
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300',
    placeholder: 'from-rose-500 to-red-700',
    description: 'Medicine, wellbeing and public health',
  },
  sports: {
    icon: Trophy,
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300',
    placeholder: 'from-orange-500 to-amber-700',
    description: 'Football, basketball, tennis and more',
  },
  entertainment: {
    icon: Clapperboard,
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-400/15 dark:text-pink-300',
    placeholder: 'from-pink-500 to-fuchsia-700',
    description: 'Film, TV, music and celebrities',
  },
};

const FALLBACK: CategoryStyle = {
  icon: Newspaper,
  badge: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-400/15 dark:text-zinc-300',
  placeholder: 'from-zinc-500 to-zinc-700',
  description: 'News and stories',
};

export function getCategoryStyle(name: string | null | undefined): CategoryStyle {
  if (!name) return FALLBACK;
  return STYLES[name.trim().toLowerCase()] ?? FALLBACK;
}
