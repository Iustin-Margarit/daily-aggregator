'use client';

import { translator } from '@/lib/i18n';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_INFO } from '@/lib/i18n/config';
import { useClientValue } from '@/lib/use-client-value';

/** The reader's edition from its cookie: the root layout (and its provider) is what failed, so it is read here. */
function readLocale() {
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * The last safety net: shown only when the root layout itself fails, so it
 * brings its own <html> and plain styles (no fonts, no theme).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useClientValue(readLocale, DEFAULT_LOCALE);
  const { t } = translator(locale);
  return (
    <html lang={LOCALE_INFO[locale].htmlLang}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#efe6d6',
          color: '#2a1f17',
          fontFamily: 'Georgia, "Times New Roman", serif',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem', border: '4px double rgba(120, 88, 40, 0.55)', padding: '2rem 1.75rem', background: '#f8f1e3' }}>
          <p lang="en" style={{ margin: 0, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '0.8rem', color: '#8b2a1d' }}>
            The Daily Aggregator
          </p>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontStyle: 'italic' }}>{t.errors.stopPresses}</h1>
          <p style={{ margin: '0.75rem 0 1.5rem', lineHeight: 1.5 }}>{t.errors.globalNote}</p>
          <button
            type="button"
            onClick={reset}
            style={{ font: 'inherit', padding: '0.6rem 1.4rem', border: '1px solid #2a1f17', background: '#2a1f17', color: '#f8f1e3', cursor: 'pointer' }}
          >
            {t.common.tryAgain}
          </button>
        </main>
      </body>
    </html>
  );
}
