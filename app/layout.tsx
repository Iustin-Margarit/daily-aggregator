import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Fraunces, Jost, Source_Serif_4, Special_Elite, UnifrakturMaguntia } from 'next/font/google';
import { ThemeProvider } from '@/components/site/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { prefAttributes } from '@/lib/reader-prefs';
import { siteConfig } from '@/lib/site';
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
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${siteConfig.masthead} · your own morning paper`, template: `%s · ${siteConfig.masthead}` },
  description: siteConfig.description,
  applicationName: siteConfig.masthead,
  openGraph: {
    type: 'website',
    siteName: siteConfig.masthead,
    title: `${siteConfig.masthead}: ${siteConfig.motto.toLowerCase()}`,
    description: siteConfig.description,
    locale: 'en_GB',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.masthead}: ${siteConfig.motto.toLowerCase()}`,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efe6d6' },
    { media: '(prefers-color-scheme: dark)', color: '#141a26' },
  ],
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
      lang="en"
      suppressHydrationWarning
      data-font-size={fontSize && FONT_SIZES.has(fontSize) ? fontSize : 'medium'}
      // Reading preferences kept on this device (clock, street banner, photographs, columns): lib/reader-prefs.ts.
      {...prefAttributes((name) => cookieStore.get(name)?.value)}
      className={`${display.variable} ${serif.variable} ${label.variable} ${masthead.variable} ${typewriter.variable}`}
    >
      <body className="min-h-screen">
        <ThemeProvider nonce={nonce}>
          <ToastProvider>
            {/* Every page is printed on one sheet of newsprint (styles/globals.css). */}
            <div className="sheet">{children}</div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
