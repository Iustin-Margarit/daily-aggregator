import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FormMessage({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const Icon = type === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-xl px-3.5 py-3 text-[0.92rem]',
        type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-panel text-foreground',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-6 space-y-1.5 text-center">
      <h1 className="headline text-[2rem]">{title}</h1>
      {description && <p className="text-[0.98rem] text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Maps Supabase auth errors to friendly messages. */
export function friendlyAuthError(error: { message: string; code?: string } | null): string | null {
  if (!error) return null;
  const message = error.message.toLowerCase();
  if (error.code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (error.code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please confirm your email address first. Check your inbox for the confirmation link.';
  }
  if (error.code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (error.code === 'weak_password' || message.includes('password should')) {
    return 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.';
  }
  if (error.code === 'same_password') return 'Your new password must be different from the current one.';
  if (message.includes('rate limit') || error.code === 'over_email_send_rate_limit') {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (message.includes('fetch')) return 'Could not reach the server. Check your connection and try again.';
  if (error.code === 'signup_disabled' || message.includes('signups not allowed')) {
    return 'New accounts cannot be created right now. Please try again later.';
  }
  if (message.includes('provider is not enabled') || error.code === 'provider_disabled') {
    return 'This way of signing in is switched off right now. Please use your email instead.';
  }
  if (message.includes('72 characters')) return 'That password is too long. Please use at most 72 characters.';
  // Anything else is a technical message; it goes to the console, not to the reader.
  console.warn('[auth]', error.code ?? '', error.message);
  return 'Something went wrong. Please try again in a moment.';
}
