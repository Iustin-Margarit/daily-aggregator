import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Runs before every page (Next.js 16 "proxy", formerly "middleware"): refreshes
 * the Supabase session, sets the per-request Content-Security-Policy nonce and
 * sends logged-out visitors away from private pages.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    '/((?!_next/static|_next/image|_vercel/|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
