import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/signup-form';
import { getSignInOptions } from '@/lib/supabase/auth-settings';

export const metadata: Metadata = { title: 'Create an account' };

export default async function SignupPage() {
  const { google } = await getSignInOptions();
  return <SignupForm googleEnabled={google} />;
}
