import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Fraunces, Jost, Source_Serif_4, Special_Elite, UnifrakturMaguntia } from 'next/font/google';
import { NavigationTracker } from '@/components/site/navigation-tracker';
import { SoundTicket } from '@/components/site/sound-ticket';
import { ThemeProvider } from '@/components/site/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { LANG_TAG } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { prefAttributes } from '@/lib/reader-prefs';
import { siteConfig } from '@/lib/site';
import { THEME_COLORS, THEME_SCRIPT } from '@/lib/theme';
import '@/styles/globals.css';

// `subsets` is what is preloaded: only Latin. The latin-ext files (ő, ł, ș in names) stay declared and are
// fetched only by a page that prints such a letter (unicode-range), instead of on every page.
// Fraunces with its 'soft' axis: rounded old-style headlines.
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], variable: '--font-fraunces', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif', display: 'swap' });
// Jost: a 1920s geometric sans for labels, buttons and navigation.
const label = Jost({ subsets: ['latin'], variable: '--font-jost', display: 'swap' });
// Blackletter for the newspaper title only.
const masthead = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], variable: '--font-unifraktur', display: 'swap' });
// Typewriter type for stamps and small notes.
const typewriter = Special_Elite({ weight: '400', subsets: ['latin'], variable: '--font-special-elite', display: 'swap' });
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
  const { t } = await getI18n();
  const motto = t.masthead.motto.toLocaleLowerCase(LANG_TAG);
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
      locale: 'en_GB',
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
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const fontSize = cookieStore.get('font-size')?.value;
  // Set by the proxy (proxy.ts); lets the theme's inline script pass the Content-Security-Policy.
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  return (
    <html
      // British English: also the language the browser hyphenates justified columns in.
      lang={LANG_TAG}
      suppressHydrationWarning
      data-font-size={fontSize && FONT_SIZES.has(fontSize) ? fontSize : 'medium'}
      // Reading preferences kept on this device (clock, street banner, photographs, columns): lib/reader-prefs.ts.
      {...prefAttributes((name) => cookieStore.get(name)?.value)}
      className={`${display.variable} ${serif.variable} ${label.variable} ${masthead.variable} ${typewriter.variable}`}
    >
      <head>
        {/* The Morning or Night edition before the first paint (lib/theme.ts). */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <ToastProvider>
            {/* Every page is printed on one sheet of newsprint (styles/globals.css). */}
            <div className="sheet">{children}</div>
            {/* Stop the street sound from any page once the banner is out of sight. */}
            <SoundTicket />
            {/* Remembers the page the reader came from, for the Back links. */}
            <NavigationTracker />
            {/* Vercel Web Analytics (page views, no cookies), only on Vercel. The script is added by the page's own
                nonced scripts, so 'strict-dynamic' lets it run; it talks to /_vercel/insights on our own origin. */}
            {process.env.VERCEL ? <Analytics /> : null}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
