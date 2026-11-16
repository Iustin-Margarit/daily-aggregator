'use client';

import { TimeAgo } from '@/components/site/time-ago';
import { SheetLink } from '@/components/story/sheet-link';
import { getCategoryStyle } from '@/lib/category-styles';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { cleanText } from '@/lib/text';
import type { AlsoReported, RelatedArticle } from '@/lib/types';

/**
 * The same news from other papers (grouped when the stories were fetched), the paper's name first.
 * Each opens in the sheet's place, like More from the desk, so Close still returns to the page.
 */
export function AlsoReportedBy({ stories }: { stories: AlsoReported[] }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="also-reported" className="mt-8 border-t-[3px] border-double border-rule/45 pt-4">
      <h3 id="also-reported" className="kicker">
        {t.article.alsoReported}
      </h3>
      <p className="mt-1 text-[0.92rem] italic text-muted-foreground">{t.article.alsoReportedNote}</p>
      <ul className="mt-2 divide-y divide-rule/30">
        {stories.map((story) => (
          <li key={story.id}>
            <SheetLink slug={story.slug} replace className="group block py-3">
              <span className="byline block">
                <span className="font-semibold uppercase tracking-[0.08em] text-foreground/85">{story.source_name}</span> · <TimeAgo date={story.published_at} />
              </span>
              <span className="mt-1 block font-display text-[1.04rem] font-semibold leading-snug decoration-1 underline-offset-2 group-hover:underline">
                {cleanText(story.title)}
              </span>
            </SheetLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Three more stories from the same desk, as headline lines. Each opens in the sheet's place (the address
 * is replaced, not added), so Close still returns to the page the reader started from.
 */
export function MoreFromDesk({ stories, categoryName }: { stories: RelatedArticle[]; categoryName: string | null }) {
  const { t, fmt } = useI18n();
  const key = getCategoryStyle(categoryName).key;
  const heading = fmt(t.article.moreFromDesk, { section: sectionText(t, key, categoryName ?? '').name });
  return (
    <section aria-labelledby="more-from-desk" className="mt-8 border-t-[3px] border-double border-rule/45 pt-4">
      <h3 id="more-from-desk" className="kicker">
        {heading}
      </h3>
      <ul className="mt-2 divide-y divide-rule/30">
        {stories.map((story) => (
          <li key={story.id} data-section={getCategoryStyle(story.category_name).key ?? undefined}>
            <SheetLink slug={story.slug} replace className="group block py-3">
              <span className="headline line-clamp-3 text-[1.1rem] decoration-1 underline-offset-2 group-hover:underline">{cleanText(story.title)}</span>
              <span className="byline mt-1 block">
                <span className="font-medium text-foreground/80">{story.source_name}</span> · <TimeAgo date={story.published_at} />
              </span>
            </SheetLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
