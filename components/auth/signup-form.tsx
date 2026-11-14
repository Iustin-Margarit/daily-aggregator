'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { AuthHeading, FormMessage, friendlyAuthError } from '@/components/auth/form-message';
import { GoogleButton, OrDivider } from '@/components/auth/google-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { checkPassword, PasswordStrength } from '@/components/ui/password-strength';
import { Spinner } from '@/components/ui/spinner';
import { passwordTooLong } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';

export function SignupForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { t, rich } = useI18n();
  const w = t.auth.signup;
  const errors = t.auth.errors;

  const strength = checkPassword(password, t.auth.strength);
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (passwordTooLong(password)) {
      setError(errors.tooLong);
      return;
    }
    if (!strength.isAcceptable) {
      setError(errors.stronger);
      return;
    }
    if (password !== confirm) {
      setError(errors.mismatch);
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    setLoading(false);

    if (signUpError) {
      setError(friendlyAuthError(signUpError, errors));
      return;
    }
    // With email confirmation disabled (local development) we get a session right away.
    if (data.session) {
      router.replace('/onboarding');
      router.refresh();
      return;
    }
    // Supabase deliberately answers the same way for a new and an already registered
    // address, so nobody can use this form to find out who has an account. We show the
    // same screen in both cases.
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] border-[3px] border-double border-rule/30 bg-panel">
          <MailCheck className="h-6 w-6" />
        </div>
        <AuthHeading
          title={w.checkInbox}
          description={rich(w.sent, { email: <span className="break-all font-medium text-foreground">{sentTo}</span> })}
        />
        <Button variant="outline" asChild className="w-full">
          <Link href={`/login?email=${encodeURIComponent(sentTo)}`}>{t.auth.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={w.title} description={w.description} />
      {googleEnabled && (
        <>
          <GoogleButton />
          <OrDivider>{t.auth.orSignUpEmail}</OrDivider>
        </>
      )}
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
        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
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
            aria-invalid={mismatch}
          />
          {mismatch && <p className="text-xs text-destructive">{errors.mismatch}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading || !email || !password || !confirm}>
          {loading && <Spinner />}
          {loading ? w.submitting : w.submit}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm italic text-muted-foreground">
        {w.haveAccount}{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t.auth.logIn}
        </Link>
      </p>
    </>
  );
}
