import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { getSignInOptions } from '@/lib/supabase/auth-settings';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage() {
  const { google } = await getSignInOptions();
  return (
    <Suspense>
      <LoginForm googleEnabled={google} />
    </Suspense>
  );
}
