import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/article/', '/latest', '/section/'], disallow: ['/admin', '/api', '/saved', '/search', '/settings', '/sections', '/profile', '/onboarding', '/feed', '/auth'] },
  };
}
