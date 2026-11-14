import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import Link from 'next/link';
import { CircleAlert, MailCheck } from 'lucide-react';
import { AuthHeading } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.emailConfirmed };
}

export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>;
}) {
  const [{ type, error }, { t }] = await Promise.all([searchParams, getI18n()]);
  const w = t.auth.confirmed;

  if (error) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-destructive text-destructive">
          <CircleAlert className="h-6 w-6" />
        </div>
        <AuthHeading
          title={w.failed}
          // The text is chosen here; nothing from the URL is displayed.
          description={error === 'expired' ? w.expired : w.invalid}
        />
        <Button asChild className="w-full">
          <Link href="/login">{t.auth.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  const isEmailChange = type === 'email_change';
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] border-[3px] border-double border-rule/30 bg-panel">
        <MailCheck className="h-6 w-6" />
      </div>
      <AuthHeading
        title={isEmailChange ? w.changeTitle : w.title}
        description={isEmailChange ? w.changeNote : w.note}
      />
      <Button asChild className="w-full">
        <Link href={isEmailChange ? '/profile' : '/feed'}>{isEmailChange ? w.backToProfile : w.goToFeed}</Link>
      </Button>
    </div>
  );
}
