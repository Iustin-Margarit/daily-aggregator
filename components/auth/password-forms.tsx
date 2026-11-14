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
import { useI18n } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { t, rich } = useI18n();
  const w = t.auth.forgot;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setLoading(false);
    if (resetError) setError(friendlyAuthError(resetError, t.auth.errors));
    else setSent(true);
  };

  return (
    <>
      <AuthHeading title={w.title} description={w.description} />
      {sent ? (
        <div className="space-y-4">
          <FormMessage type="success">{rich(w.sent, { email: <strong className="break-all">{email}</strong> })}</FormMessage>
          <Button variant="outline" asChild className="w-full">
            <Link href="/login">{t.auth.backToLogin}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <FormMessage type="error">{error}</FormMessage>}
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
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading && <Spinner />}
            {w.submit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {w.remembered}{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t.auth.logIn}
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
  const { t } = useI18n();
  const w = t.auth.update;
  const errors = t.auth.errors;

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (passwordTooLong(password)) {
      setError(errors.tooLong);
      return;
    }
    if (!checkPassword(password, t.auth.strength).isAcceptable) {
      setError(errors.stronger);
      return;
    }
    if (password !== confirm) {
      setError(errors.mismatch);
      return;
    }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(friendlyAuthError(updateError, errors));
      return;
    }
    showToast({ type: 'success', title: w.updated, message: w.updatedNote });
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
        <AuthHeading title={w.expired} description={w.expiredNote} />
        <Button asChild className="w-full">
          <Link href="/forgot-password">{w.newLink}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={w.title} description={w.description} />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <FormMessage type="error">{error}</FormMessage>}
        <div className="space-y-2">
          <Label htmlFor="password">{w.new}</Label>
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
          <Label htmlFor="confirm-password">{w.confirm}</Label>
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
          {w.submit}
        </Button>
      </form>
    </>
  );
}
