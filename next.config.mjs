/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second build (e.g. `NEXT_DIST_DIR=.next-preview`) run next to `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // The old names of Sections and Settings, kept for good: confirmation emails already sent link to
  // /auth/callback?next=/onboarding, and readers have bookmarks. The query goes along (/profile?delete=confirm).
  async redirects() {
    return [
      { source: '/onboarding', destination: '/sections', permanent: true },
      { source: '/profile', destination: '/settings', permanent: true },
      // Accounts sign in with Google only (since V2.1): the email and password pages are gone.
      { source: '/signup', destination: '/login', permanent: true },
      { source: '/forgot-password', destination: '/login', permanent: true },
      { source: '/update-password', destination: '/login', permanent: true },
      { source: '/email-confirmed', destination: '/', permanent: true },
      // /feed was the readers' front page until V2. A search and one section have their own pages now,
      // every section is All the latest, and anything else is the front page (the first match wins).
      { source: '/feed', has: [{ type: 'query', key: 'q', value: '(?<q>.*\\S.*)' }], destination: '/search', permanent: true },
      { source: '/feed', has: [{ type: 'query', key: 'topics', value: 'all' }], destination: '/latest', permanent: true },
      { source: '/feed', has: [{ type: 'query', key: 'topics', value: '(?<topic>[^,]+)' }], destination: '/section/:topic', permanent: true },
      { source: '/feed', destination: '/', permanent: true },
    ];
  },
  // The Content-Security-Policy is set per request in lib/supabase/proxy.ts (it needs a nonce).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
          // Browsers that have seen the site over HTTPS refuse plain HTTP for two years (ignored on http://localhost).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
