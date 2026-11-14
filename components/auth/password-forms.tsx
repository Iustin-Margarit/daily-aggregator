'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { AuthHeading, FormMessage, friendlyAuthError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { checkPassword, PasswordStrength } from '@/components/ui/password-strength';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { passwordTooLong } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setLoading(false);
    if (resetError) setError(friendlyAuthError(resetError));
    else setSent(true);
  };

  return (
    <>
      <AuthHeading title="Reset your password" description="Enter your email and we will send you a link to choose a new password." />
      {sent ? (
        <div className="space-y-4">
          <FormMessage type="success">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. It expires in one hour. Can’t find it? Look in your Spam folder.
          </FormMessage>
          <Button variant="outline" asChild className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <FormMessage type="error">{error}</FormMessage>}
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
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading && <Spinner />}
            Send reset link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </>
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (passwordTooLong(password)) {
      setError('That password is too long. Please use at most 72 characters.');
      return;
    }
    if (!checkPassword(password).isAcceptable) {
      setError('Please choose a stronger password (at least 8 characters, mixing letters and numbers).');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(friendlyAuthError(updateError));
      return;
    }
    showToast({ type: 'success', title: 'Password updated', message: 'You are logged in with your new password.' });
    router.replace('/feed');
    router.refresh();
  };

  if (hasSession === null) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] border-[3px] border-double border-rule/30 bg-panel">
          <KeyRound className="h-6 w-6 text-muted-foreground" />
        </div>
        <AuthHeading
          title="This link has expired"
          description="Password reset links work once and expire after an hour. Request a new one to continue."
        />
        <Button asChild className="w-full">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Choose a new password" description="Pick something you have not used before." />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <FormMessage type="error">{error}</FormMessage>}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
          {loading && <Spinner />}
          Update password
        </Button>
      </form>
    </>
  );
}
