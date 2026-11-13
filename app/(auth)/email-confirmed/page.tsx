import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleAlert, MailCheck } from 'lucide-react';
import { AuthHeading } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Email confirmation' };

export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>;
}) {
  const { type, error } = await searchParams;

  if (error) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-destructive text-destructive">
          <CircleAlert className="h-6 w-6" />
        </div>
        <AuthHeading
          title="We could not confirm that link"
          description={
            // The text is chosen here; nothing from the URL is displayed.
            error === 'expired'
              ? 'This link has expired or was already used. Links work once and expire after an hour - request a new one and try again.'
              : 'This link is not valid. Links work once and expire after an hour - request a new one and try again.'
          }
        />
        <Button asChild className="w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  const isEmailChange = type === 'email_change';
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-rule">
        <MailCheck className="h-6 w-6" />
      </div>
      <AuthHeading
        title={isEmailChange ? 'Email change confirmed' : 'Email confirmed'}
        description={
          isEmailChange
            ? 'If you were asked to confirm on both your old and your new address, also click the link in the other email. The change takes effect after both are confirmed.'
            : 'Your email address is confirmed. You can continue to your feed.'
        }
      />
      <Button asChild className="w-full">
        <Link href={isEmailChange ? '/profile' : '/feed'}>{isEmailChange ? 'Back to profile' : 'Go to my feed'}</Link>
      </Button>
    </div>
  );
}
