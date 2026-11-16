'use client';

import { useEffect, useEffectEvent } from 'react';
import { createPortal } from 'react-dom';
import { formatReadingTime } from '@/lib/format';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { getCategoryStyle } from '@/lib/category-styles';
import { siteConfig } from '@/lib/site';
import { cleanText } from '@/lib/text';
import type { SavedArticle } from '@/lib/types';


/**
 * A saved story printed as a newspaper clipping (styles: .print-clipping in
 * globals.css): cut out along a dashed line, with the paper's name, the
 * headline, where and when it was published, the summary and the reader's own
 * note. It exists only while the browser's print dialog is open, and it always
 * prints in dark ink on white paper, whichever edition is on screen. The page
 * title becomes the headline, so "Save as PDF" suggests a sensible file name.
 */
export function PrintClipping({ article, onDone }: { article: SavedArticle; onDone: () => void }) {
  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const { t, fmt, dates } = useI18n();
  const readingTime = formatReadingTime(article.reading_minutes);
  const longDate = (iso: string) => dates.long(new Date(iso));
  const fileTitle = fmt(t.saved.print.fileSuffix, { title });
  const done = useEffectEvent(onDone);

  useEffect(() => {
    const root = document.documentElement;
    const pageTitle = document.title;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      root.classList.remove('printing-clipping');
      document.title = pageTitle;
      done();
    };
    root.classList.add('printing-clipping');
    document.title = fileTitle;
    window.addEventListener('afterprint', finish);
    // Give the clipping one frame to be laid out before the dialog opens.
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finish);
      root.classList.remove('printing-clipping');
      document.title = pageTitle;
    };
  }, [fileTitle]);

  return createPortal(
    <div className="print-clipping" aria-hidden="true">
      <article className="print-clipping-cut">
        <header className="print-clipping-head">
          <span className="print-clipping-paper" lang="en">
            {siteConfig.masthead}
          </span>
          <span>{longDate(article.published_at)}</span>
        </header>
        <p className="print-clipping-kicker">{sectionText(t, getCategoryStyle(article.category_name).key, article.category_name).name}</p>
        <h1 className="print-clipping-title">{title}</h1>
        <p className="print-clipping-byline">
          {article.source_name}
          {readingTime && <> · {readingTime}</>}
        </p>
        {summary && <p className="print-clipping-text">{summary}</p>}
        {article.notes && (
          <div className="print-clipping-note">
            <p className="print-clipping-note-label">{t.saved.print.myNote}</p>
            <p className="print-clipping-note-text">{article.notes}</p>
          </div>
        )}
        <footer className="print-clipping-foot">
          <span>{fmt(t.saved.print.clipped, { date: longDate(article.saved_at) })}</span>
          <span className="print-clipping-url">{article.url}</span>
        </footer>
      </article>
    </div>,
    document.body,
  );
}
