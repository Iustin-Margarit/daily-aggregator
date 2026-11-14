import { AlertCircle, CheckCircle2 } from 'lucide-react';
import en, { type Dictionary } from '@/lib/i18n/dictionaries/en';
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

/** Maps Supabase auth errors to friendly messages, in the reader's language (`m`: auth.errors). */
export function friendlyAuthError(error: { message: string; code?: string } | null, m: Dictionary['auth']['errors'] = en.auth.errors): string | null {
  if (!error) return null;
  const message = error.message.toLowerCase();
  if (error.code === 'invalid_credentials' || message.includes('invalid login credentials')) return m.invalidCredentials;
  if (error.code === 'email_not_confirmed' || message.includes('email not confirmed')) return m.notConfirmed;
  if (error.code === 'user_already_exists' || message.includes('already registered')) return m.exists;
  if (error.code === 'weak_password' || message.includes('password should')) return m.weak;
  if (error.code === 'same_password') return m.same;
  if (message.includes('rate limit') || error.code === 'over_email_send_rate_limit') return m.rateLimit;
  if (message.includes('fetch')) return m.network;
  if (error.code === 'signup_disabled' || message.includes('signups not allowed')) return m.signupDisabled;
  if (message.includes('provider is not enabled') || error.code === 'provider_disabled') return m.providerDisabled;
  if (message.includes('72 characters')) return m.tooLong;
  // Anything else is a technical message; it goes to the console, not to the reader.
  console.warn('[auth]', error.code ?? '', error.message);
  return m.unknown;
}
