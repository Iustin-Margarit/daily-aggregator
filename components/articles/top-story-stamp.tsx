'use client';

import { useId } from 'react';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/** Wax colour: the reader's daytime accent (oxblood by default), deep red in both editions. */
const WAX = 'var(--accent-day, #8b1e1e)';

/**
 * A blob of sealing wax pressed on the corner of the lead photo, with "Top
 * Story · No. 1" raised in it. The wax's outline is a public-domain seal and
 * the pressed ring is a real 1902 postmark (docs/ASSETS.md).
 */
export function TopStoryStamp({ className }: { className?: string }) {
  const ring = `${useId()}-ring`;
  const { t } = useI18n();
  return (
    <div className={cn('pointer-events-none relative', className)} aria-hidden="true">
      <span
        className="absolute inset-0"
        style={{
          backgroundColor: WAX,
          backgroundImage: [
            'radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.3), transparent 46%)',
            'radial-gradient(circle at 64% 72%, rgb(0 0 0 / 0.3), transparent 62%)',
          ].join(', '),
          mask: 'url(/ornaments/seal.webp) center / contain no-repeat',
        }}
      />
      {/* The seal's matrix pressed into the wax: a dark groove with a lit edge. */}
      <Ornament name="postmark-ring" className="absolute left-[15%] top-[15%] w-[70%] [--ornament-ink:rgb(0_0_0/0.42)]" />
      <Ornament name="postmark-ring" className="absolute left-[15.6%] top-[16.2%] w-[70%] [--ornament-ink:rgb(255_255_255/0.16)]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" focusable="false">
        <defs>
          <path id={ring} d="M50 50m-25 0a25 25 0 1 1 50 0a25 25 0 1 1-50 0" />
        </defs>
        {[
          { fill: 'rgb(0 0 0 / 0.4)', dy: 0.7 },
          { fill: 'rgb(255 236 214 / 0.86)', dy: 0 },
        ].map(({ fill, dy }) => (
          <g key={dy} fill={fill} transform={`translate(0 ${dy})`}>
            <text style={{ fontFamily: 'var(--font-special-elite)', fontSize: 8.2, letterSpacing: 0.6 }}>
              <textPath href={`#${ring}`} startOffset="2%" textLength="150" lengthAdjust="spacing">
                {t.story.topStamp}
              </textPath>
            </text>
            <text x="50" y="47" textAnchor="middle" style={{ fontFamily: 'var(--font-special-elite)', fontSize: 7, letterSpacing: 1 }}>
              {t.story.topStampNo}
            </text>
            <text
              x="50"
              y="63"
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-fraunces)', fontSize: 19, fontWeight: 900, fontStyle: 'italic' }}
            >
              1
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
