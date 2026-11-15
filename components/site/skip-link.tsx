'use client';

import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';

/**
 * The first Tab stop on every reader's page: a printed slip that appears only
 * when it has keyboard focus and jumps over the header (title, tabs, language
 * stamp) to the page itself, `<main id="main">` (styles: .skip-link).
 */
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a href="#main" className="skip-link">
      {t.nav.skipToContent}
      <Ornament name="fist" className="h-[0.95rem] rotate-90 [--ornament-ink:currentColor]" />
    </a>
  );
}
