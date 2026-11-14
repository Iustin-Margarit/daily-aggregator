import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { getSignInOptions } from '@/lib/supabase/auth-settings';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.logIn };
}

export default async function LoginPage() {
  const { google } = await getSignInOptions();
  return (
    <Suspense>
      <LoginForm googleEnabled={google} />
    </Suspense>
  );
}
