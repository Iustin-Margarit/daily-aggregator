import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Oswald, Playfair_Display, Source_Serif_4 } from 'next/font/google';
import { ThemeProvider } from '@/components/site/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { siteConfig } from '@/lib/site';
import '@/styles/globals.css';

const display = Playfair_Display({ subsets: ['latin', 'latin-ext'], variable: '--font-playfair', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], variable: '--font-source-serif', display: 'swap' });
const label = Oswald({ subsets: ['latin', 'latin-ext'], variable: '--font-oswald', display: 'swap' });

export const metadata: Metadata = {
  title: { default: siteConfig.masthead, template: `%s · ${siteConfig.masthead}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1ece1' },
    { media: '(prefers-color-scheme: dark)', color: '#151411' },
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
      className={`${display.variable} ${serif.variable} ${label.variable}`}
    >
      <body className="min-h-screen">
        <ThemeProvider nonce={nonce}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
