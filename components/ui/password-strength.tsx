'use client';

import { cn } from '@/lib/utils';

export type PasswordCheck = { score: 0 | 1 | 2 | 3 | 4; label: string; isAcceptable: boolean; hints: string[] };

const COMMON = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', '111111'];

/** Lightweight strength estimate (replaces the ~800 KB zxcvbn bundle). */
export function checkPassword(password: string): PasswordCheck {
  const hints: string[] = [];
  if (!password) return { score: 0, label: 'Too short', isAcceptable: false, hints: ['Use at least 8 characters.'] };

  let score = 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (classes >= 2) score++;
  if (classes >= 3 && password.length >= 10) score++;

  const lower = password.toLowerCase();
  if (COMMON.some((word) => lower.includes(word)) || /^(.)\1+$/.test(password) || /^(0123|1234|abcd)/i.test(password)) {
    score = Math.min(score, 1);
    hints.push('Avoid common words and simple sequences.');
  }
  if (password.length < 8) {
    score = 0;
    hints.push('Use at least 8 characters.');
  } else if (password.length < 12) {
    hints.push('Longer passwords are much stronger.');
  }
  if (classes < 3) hints.push('Mix upper and lower case letters, numbers or symbols.');

  const clamped = Math.min(score, 4) as PasswordCheck['score'];
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: clamped, label: labels[clamped], isAcceptable: password.length >= 8 && clamped >= 2, hints };
}

const BAR_COLORS = ['bg-destructive', 'bg-destructive', 'bg-[#a16207]', 'bg-foreground', 'bg-foreground'];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const result = checkPassword(password);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 bg-foreground/10', i < Math.max(result.score, 1) && BAR_COLORS[result.score])}
          />
        ))}
      </div>
      <p className="text-xs italic text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{result.label}</span>
        {result.hints[0] ? ` · ${result.hints[0]}` : ''}
      </p>
    </div>
  );
}
