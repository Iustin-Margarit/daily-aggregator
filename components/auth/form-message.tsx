import { Ornament } from '@/components/site/ornament';
import en, { type Dictionary } from '@/lib/i18n/dictionaries/en';
import { cn } from '@/lib/utils';

/**
 * A notice above a form, printed like the toasts (components/ui/toast.tsx): a rule down its left edge, red for a
 * problem, brass with a wax seal when something went through.
 */
export function FormMessage({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const failed = type === 'error';
  return (
    <div
      role={failed ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-[2px] border-l-[3px] px-3.5 py-3 text-[0.92rem]',
        failed ? 'border-destructive/70 bg-destructive/8 text-destructive' : 'border-(--ink-gold) bg-panel text-foreground',
      )}
    >
      {!failed && <Ornament name="seal" className="mt-0.5 h-[1.15rem] shrink-0 [--ornament-ink:var(--brass-ink)]" />}
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
