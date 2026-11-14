'use client';

import '@/styles/editions.css';

import { useId } from 'react';
import { LOCALE_INFO, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

/*
 * An edition's ink-stamp monogram (EN, FR, ES, DE, RO) struck over a small
 * printed flag of its country, like a postmark over a postage stamp
 * (styles/editions.css). The flags follow the official designs (public domain);
 * Spain's is the plain civil flag, the arms being too small to print here. Their
 * inks are muted period pigments (--flag-* tokens), worn by a speckle filter,
 * and stay behind a paper wash so the monogram reads first.
 */

function FlagShapes({ code, clip }: { code: Locale; clip: string }) {
  switch (code) {
    case 'en':
      return (
        <>
          <clipPath id={clip}>
            <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
          </clipPath>
          <rect width="60" height="30" fill="var(--flag-navy)" />
          <path d="M0 0l60 30m0-30L0 30" stroke="var(--flag-white)" strokeWidth="6" />
          <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${clip})`} stroke="var(--flag-red)" strokeWidth="4" />
          <path d="M30 0v30M0 15h60" stroke="var(--flag-white)" strokeWidth="10" />
          <path d="M30 0v30M0 15h60" stroke="var(--flag-red)" strokeWidth="6" />
        </>
      );
    case 'fr':
      return (
        <>
          <rect width="1" height="2" fill="var(--flag-blue)" />
          <rect x="1" width="1" height="2" fill="var(--flag-white)" />
          <rect x="2" width="1" height="2" fill="var(--flag-red)" />
        </>
      );
    case 'es':
      return (
        <>
          <rect width="3" height="2" fill="var(--flag-red)" />
          <rect y="0.5" width="3" height="1" fill="var(--flag-yellow)" />
        </>
      );
    case 'de':
      return (
        <>
          <rect width="3" height="0.67" fill="var(--flag-black)" />
          <rect y="0.66" width="3" height="0.68" fill="var(--flag-red)" />
          <rect y="1.33" width="3" height="0.67" fill="var(--flag-gold)" />
        </>
      );
    case 'ro':
      return (
        <>
          <rect width="1" height="2" fill="var(--flag-blue)" />
          <rect x="1" width="1" height="2" fill="var(--flag-yellow)" />
          <rect x="2" width="1" height="2" fill="var(--flag-red)" />
        </>
      );
  }
}

function EditionFlag({ code }: { code: Locale }) {
  const id = useId().replace(/:/g, '');
  const worn = `${id}-worn`;
  return (
    <svg
      className="edition-flag"
      // The Union Jack is drawn 2:1 and trimmed to the same 3:2 as the others.
      viewBox={code === 'en' ? '0 0 60 30' : '0 0 3 2'}
      preserveAspectRatio="xMidYMid slice"
      style={{ filter: `url(#${worn})` }}
      aria-hidden="true"
      focusable="false"
    >
      <filter id={worn} x="0" y="0" width="1" height="1">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 2.05" result="speckle" />
        <feComposite in="SourceGraphic" in2="speckle" operator="in" />
      </filter>
      <FlagShapes code={code} clip={`${id}-clip`} />
    </svg>
  );
}

/** The stamp of one edition over its flag; decorative (the edition's name is said by the control around it). */
export function EditionMark({ code, className, active }: { code: Locale; className?: string; active?: boolean }) {
  return (
    <span className={cn('edition-mark', className)} data-active={active || undefined} aria-hidden="true">
      <EditionFlag code={code} />
      <span className="edition-stamp">{LOCALE_INFO[code].monogram}</span>
    </span>
  );
}
