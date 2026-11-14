import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { ForgotPasswordForm } from '@/components/auth/password-forms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.forgotPassword };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
