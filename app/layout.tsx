import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Fraunces, Jost, Source_Serif_4, Special_Elite, UnifrakturMaguntia } from 'next/font/google';
import localFont from 'next/font/local';
import { SoundTicket } from '@/components/site/sound-ticket';
import { ThemeProvider } from '@/components/site/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { LOCALE_INFO } from '@/lib/i18n/config';
import { I18nProvider } from '@/lib/i18n/client';
import { getI18n } from '@/lib/i18n/server';
import { prefAttributes } from '@/lib/reader-prefs';
import { siteConfig } from '@/lib/site';
import { THEME_COLORS, THEME_SCRIPT } from '@/lib/theme';
import '@/styles/globals.css';

// Fraunces with its 'soft' axis: rounded old-style headlines.
const display = Fraunces({ subsets: ['latin', 'latin-ext'], axes: ['SOFT', 'opsz'], variable: '--font-fraunces', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], variable: '--font-source-serif', display: 'swap' });
// Jost: a 1920s geometric sans for labels, buttons and navigation.
const label = Jost({ subsets: ['latin', 'latin-ext'], variable: '--font-jost', display: 'swap' });
// Blackletter for the newspaper title only.
const masthead = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], variable: '--font-unifraktur', display: 'swap' });
// Typewriter type for stamps and small notes.
const typewriter = Special_Elite({ weight: '400', subsets: ['latin'], variable: '--font-special-elite', display: 'swap' });
// Special Elite has no comma-below Ș ș Ț ț: this 4 KB supplement adds them (with Ă ă), composed from the
// font's own letters (app/fonts, Apache 2.0). It comes first in --font-typewriter but only covers those
// letters (unicode-range), so it is fetched only when a page prints them, in the Romanian edition.
const typewriterRo = localFont({
  src: './fonts/special-elite-ro.woff2',
  weight: '400',
  variable: '--font-special-elite-ro',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0218-021B' }],
});

/**
 * The site's public address, for absolute links in link previews: NEXT_PUBLIC_SITE_URL
 * when set (a custom domain), else the Vercel production domain, else localhost.
 */
function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  try {
    return new URL(explicit || (vercel ? `https://${vercel}` : 'http://localhost:3000'));
  } catch {
    return new URL('http://localhost:3000');
  }
}

// Link previews use app/opengraph-image.png and app/twitter-image.png (picked up by file name).
export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  const motto = t.masthead.motto.toLocaleLowerCase(LOCALE_INFO[locale].tag);
  return {
    metadataBase: siteUrl(),
    title: { default: `${siteConfig.masthead} · ${t.meta.titleDefault}`, template: `%s · ${siteConfig.masthead}` },
    description: t.meta.description,
    applicationName: siteConfig.masthead,
    openGraph: {
      type: 'website',
      siteName: siteConfig.masthead,
      title: `${siteConfig.masthead}: ${motto}`,
      description: t.meta.description,
      locale: LOCALE_INFO[locale].ogLocale,
      url: '/',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteConfig.masthead}: ${motto}`,
      description: t.meta.description,
    },
  };
}

export const viewport: Viewport = {
  // The Morning edition's paper; the theme provider repaints it for the Night edition.
  themeColor: THEME_COLORS.light,
};

const FONT_SIZES = new Set(['small', 'medium', 'large']);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookies mirror per-reader display preferences so they apply before hydration.
  const [cookieStore, requestHeaders, { locale }] = await Promise.all([cookies(), headers(), getI18n()]);
  const fontSize = cookieStore.get('font-size')?.value;
  // Set by the proxy (proxy.ts); lets the theme's inline script pass the Content-Security-Policy.
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  return (
    <html
      // The reader's edition (lib/i18n): French, Spanish or German pages also hyphenate in that language.
      lang={LOCALE_INFO[locale].htmlLang}
      suppressHydrationWarning
      data-font-size={fontSize && FONT_SIZES.has(fontSize) ? fontSize : 'medium'}
      // Reading preferences kept on this device (clock, street banner, photographs, columns): lib/reader-prefs.ts.
      {...prefAttributes((name) => cookieStore.get(name)?.value, locale)}
      className={`${display.variable} ${serif.variable} ${label.variable} ${masthead.variable} ${typewriter.variable} ${typewriterRo.variable}`}
    >
      <head>
        {/* The Morning or Night edition before the first paint (lib/theme.ts). */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <I18nProvider locale={locale}>
            <ToastProvider>
              {/* Every page is printed on one sheet of newsprint (styles/globals.css). */}
              <div className="sheet">{children}</div>
              {/* Stop the street sound from any page once the banner is out of sight. */}
              <SoundTicket />
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
