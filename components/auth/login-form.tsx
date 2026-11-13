'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthHeading, FormMessage, friendlyAuthError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import { safeNextPath } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/client';

const LINK_ERRORS: Record<string, string> = {
  link_invalid: 'That link is invalid or has expired. Please request a new one.',
  session_expired: 'Your session expired. Please log in again.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const initialError = searchParams.get('error');

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    // Only known codes are shown: text from the URL is never displayed as a message.
    initialError ? (LINK_ERRORS[initialError] ?? LINK_ERRORS.link_invalid) : null,
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
      setError(friendlyAuthError(signInError));
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
      setError(friendlyAuthError(resendError));
    } else {
      setError(null);
      setNotice('We sent you a new confirmation link.');
    }
  };

  return (
    <>
      <AuthHeading title="Log in" description="Welcome back. Your edition is ready." />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <FormMessage type="error">
            {error}
            {unconfirmed && (
              <button type="button" onClick={resendConfirmation} className="mt-1 block font-medium underline">
                Resend confirmation email
              </button>
            )}
          </FormMessage>
        )}
        {notice && <FormMessage type="success">{notice}</FormMessage>}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs italic text-muted-foreground underline-offset-4 hover:underline">
              Forgot your password?
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

        <Button type="submit" className="w-full" disabled={loading || !email || !password}>
          {loading && <Spinner />}
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm italic text-muted-foreground">
        New here?{' '}
        <Link href={`/signup${next !== '/feed' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          Create a free account
        </Link>
      </p>
    </>
  );
}
