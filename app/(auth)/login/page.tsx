import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoogleSignIn } from '@/components/auth/google-sign-in';
import { getI18n } from '@/lib/i18n/server';
import { getSignInOptions } from '@/lib/supabase/auth-settings';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.logIn };
}

/** Log in, which also creates the account on the first visit: Continue with Google. */
export default async function LoginPage() {
  const { google } = await getSignInOptions();
  return (
    <Suspense>
      <GoogleSignIn googleEnabled={google} />
    </Suspense>
  );
}
