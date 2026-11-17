import type { MetadataRoute } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { LATEST_PATH, SAVED_PATH, SECTIONS_PATH } from '@/lib/routes';
import { siteConfig } from '@/lib/site';
import { THEME_COLORS } from '@/lib/theme';

/**
 * The web app manifest (/manifest.webmanifest): "Add to Home Screen" puts the paper on a phone's home screen
 * with its blackletter "D" (docs/ASSETS.md), opening without the browser's address bar. A long press on the
 * icon offers the latest, the sections and the saved stories.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t } = await getI18n();
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: t.meta.description,
    lang: 'en-GB',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // The Morning edition's paper (the Night edition repaints the bar once the page is open).
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    categories: ['news'],
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: t.toolbar.latest, url: LATEST_PATH },
      { name: t.nav.sections, url: SECTIONS_PATH },
      { name: t.nav.saved, url: SAVED_PATH },
    ],
  };
}
