'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthHeading, FormMessage, friendlyAuthError } from '@/components/auth/form-message';
import { GoogleButton, OrDivider } from '@/components/auth/google-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n/client';
import { safeNextPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/client';

/** The error codes a link back to the login page may carry, and their words (auth.login). */
const LINK_ERRORS = { link_invalid: 'linkInvalid', session_expired: 'sessionExpired', sign_in_failed: 'signInFailed' } as const;

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const initialError = searchParams.get('error');
  const { t } = useI18n();
  const w = t.auth.login;

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    // Only known codes are shown: text from the URL is never displayed as a message.
    initialError ? w[LINK_ERRORS[initialError as keyof typeof LINK_ERRORS] ?? 'linkInvalid'] : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      setUnconfirmed(signInError.code === 'email_not_confirmed' || /not confirmed/i.test(signInError.message));
      setError(friendlyAuthError(signInError, t.auth.errors));
      return;
    }

    router.replace(next);
    router.refresh();
  };

  const resendConfirmation = async () => {
    const { error: resendError } = await createClient().auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (resendError) {
      setError(friendlyAuthError(resendError, t.auth.errors));
    } else {
      setError(null);
      setNotice(w.resent);
    }
  };

  return (
    <>
      <AuthHeading title={w.title} description={w.description} />
      {googleEnabled && (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <FormMessage type="error">
            {error}
            {unconfirmed && (
              <button type="button" onClick={resendConfirmation} className="mt-1 block font-medium underline">
                {w.resend}
              </button>
            )}
          </FormMessage>
        )}
        {notice && <FormMessage type="success">{notice}</FormMessage>}

        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link href="/forgot-password" className="text-xs italic text-muted-foreground underline-offset-4 hover:underline">
              {w.forgot}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="h-auto min-h-10 w-full whitespace-normal py-2 text-center text-balance" disabled={loading || !email || !password}>
          {loading && <Spinner />}
          {loading ? w.submitting : t.auth.logIn}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm italic text-muted-foreground">
        {w.newHere}{' '}
        <Link href={`/signup${next !== '/feed' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {w.create}
        </Link>
      </p>
    </>
  );
}
