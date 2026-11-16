'use client';

import Link from 'next/link';
import { ArticleCard } from '@/components/articles/article-card';
import { HeadlineList } from '@/components/front/headline-list';
import { Engraving } from '@/components/site/engraving';
import { Ornament } from '@/components/site/ornament';
import { getCategoryStyle } from '@/lib/category-styles';
import type { SectionDigest as Digest } from '@/lib/front-page';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { sectionPath } from '@/lib/routes';

/**
 * One section on the front page: its postage stamp and name at the head (both
 * links to the section), its newest story with a photograph, a few more
 * headlines, and "All World news" at the foot.
 */
export function SectionDigest({ digest, number, userId }: { digest: Digest; number: number; userId: string | null }) {
  const { t, fmt } = useI18n();
  const { category, photo, lines } = digest;
  const style = getCategoryStyle(category.name);
  const section = sectionText(t, style.key, category.name);
  const href = sectionPath(category.name);
  const headingId = `digest-${style.key ?? category.id}`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col" data-section={style.key ?? undefined}>
      <header className="flex items-center gap-3.5 border-b-[3px] border-double border-(--section)/45 pb-3">
        {/* The section's stamp, small, as in Sections (styles: .section-stamp, the stamp utility). */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className="section-stamp block w-[4.4rem] shrink-0">
          <span className="stamp flex flex-col items-center [--hole:3.5px]">
            <span className="w-full text-center font-label text-[0.55rem] font-semibold tracking-[0.08em] text-(--stamp-ink)">
              {fmt(t.sections.stampNo, { n: String(number).padStart(2, '0') })}
            </span>
            <Engraving name={style.engraving} className="mt-0.5 h-9 max-w-[3.2rem]" />
          </span>
        </Link>
        <div className="min-w-0">
          <h2 id={headingId} className="headline text-[1.55rem] leading-tight text-(--section)">
            <Link href={href} className="decoration-2 underline-offset-4 hover:underline">
              {section.name}
            </Link>
          </h2>
          <p className="mt-0.5 line-clamp-1 text-[0.9rem] italic text-muted-foreground">{section.description}</p>
        </div>
      </header>

      {photo && (
        <div className="pt-4">
          <ArticleCard article={photo} userId={userId} variant="digest" />
        </div>
      )}
      {lines.length > 0 && <HeadlineList articles={lines} className={photo ? 'mt-4 border-t border-rule/30 pt-3' : 'pt-4'} />}

      <Link
        href={href}
        className="group/read mt-auto inline-flex items-center gap-2.5 self-start pt-4 font-display text-[1rem] font-semibold text-(--brass-ink) hover:text-foreground"
      >
        {fmt(t.front.allSection, { name: section.name })}
        <Ornament name="fist" className="fist-poke h-[0.95rem] [--ornament-ink:currentColor]" />
      </Link>
    </section>
  );
}
