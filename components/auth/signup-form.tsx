'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { AuthHeading, FormMessage, friendlyAuthError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { checkPassword, PasswordStrength } from '@/components/ui/password-strength';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const strength = checkPassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!strength.isAcceptable) {
      setError('Please choose a stronger password (at least 8 characters, mixing letters and numbers).');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
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
      setError(friendlyAuthError(signUpError));
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-rule">
          <MailCheck className="h-6 w-6" />
        </div>
        <AuthHeading
          title="Check your inbox"
          description={
            <>
              We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>. Click it to
              finish creating your account. If you already have an account with this address, no new email is sent - log
              in instead.
            </>
          }
        />
        <Button variant="outline" asChild className="w-full">
          <Link href={`/login?email=${encodeURIComponent(sentTo)}`}>Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Create your free account" description="It takes less than a minute. Then you choose the sections you want to read." />
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
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
          />
          {mismatch && <p className="text-xs text-destructive">The passwords do not match.</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading || !email || !password || !confirm}>
          {loading && <Spinner />}
          {loading ? 'Setting up your paper…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm italic text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
