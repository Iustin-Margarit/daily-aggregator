import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { SignupForm } from '@/components/auth/signup-form';
import { getSignInOptions } from '@/lib/supabase/auth-settings';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.signUp };
}

export default async function SignupPage() {
  const { google } = await getSignInOptions();
  return <SignupForm googleEnabled={google} />;
}
