'use client';

import { useSearchParams } from 'next/navigation';
import { AuthHeading, FormMessage } from '@/components/auth/form-message';
import { GoogleButton } from '@/components/auth/google-button';
import { useI18n } from '@/lib/i18n/client';
import { safeNextPath } from '@/lib/redirect';

/** The error codes a link back to the login page may carry, and their words (auth.login). */
const LINK_ERRORS = { link_invalid: 'linkInvalid', session_expired: 'sessionExpired', sign_in_failed: 'signInFailed' } as const;

/**
 * Signing in is one button: Google. A new reader gets an account on the first press; an existing account
 * with the same address is used. Either way `?next=` brings the reader back to the page they were on.
 */
export function GoogleSignIn({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const code = searchParams.get('error');
  const { t } = useI18n();
  const w = t.auth.login;
  // Only known codes are shown: text from the address is never printed as a message.
  const error = code ? w[LINK_ERRORS[code as keyof typeof LINK_ERRORS] ?? 'signInFailed'] : null;

  return (
    <>
      <AuthHeading title={w.title} description={w.description} />
      <div className="space-y-4">
        {error && <FormMessage type="error">{error}</FormMessage>}
        {googleEnabled ? <GoogleButton next={next} /> : <FormMessage type="error">{w.googleOff}</FormMessage>}
        <p className="text-pretty text-center text-[0.92rem] italic text-muted-foreground">{w.note}</p>
      </div>
    </>
  );
}
