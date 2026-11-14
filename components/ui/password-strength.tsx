'use client';

import { useI18n } from '@/lib/i18n/client';
import en, { type Dictionary } from '@/lib/i18n/dictionaries/en';
import { cn } from '@/lib/utils';

export type PasswordCheck = { score: 0 | 1 | 2 | 3 | 4; label: string; isAcceptable: boolean; hints: string[] };

const COMMON = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', '111111'];

/** Lightweight strength estimate (replaces the ~800 KB zxcvbn bundle), with its words in the reader's language (`m`). */
export function checkPassword(password: string, m: Dictionary['auth']['strength'] = en.auth.strength): PasswordCheck {
  const hints: string[] = [];
  if (!password) return { score: 0, label: m.tooShort, isAcceptable: false, hints: [m.atLeast8] };

  let score = 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (classes >= 2) score++;
  if (classes >= 3 && password.length >= 10) score++;

  const lower = password.toLowerCase();
  if (COMMON.some((word) => lower.includes(word)) || /^(.)\1+$/.test(password) || /^(0123|1234|abcd)/i.test(password)) {
    score = Math.min(score, 1);
    hints.push(m.common);
  }
  if (password.length < 8) {
    score = 0;
    hints.push(m.atLeast8);
  } else if (password.length < 12) {
    hints.push(m.longer);
  }
  if (classes < 3) hints.push(m.mix);

  const clamped = Math.min(score, 4) as PasswordCheck['score'];
  return { score: clamped, label: m.levels[clamped], isAcceptable: password.length >= 8 && clamped >= 2, hints };
}

const BAR_COLORS = ['bg-destructive', 'bg-destructive', 'bg-[#a16207]', 'bg-foreground', 'bg-foreground'];

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useI18n();
  if (!password) return null;
  const result = checkPassword(password, t.auth.strength);
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
        {t.auth.strength.label} <span className="font-medium text-foreground">{result.label}</span>
        {result.hints[0] ? ` · ${result.hints[0]}` : ''}
      </p>
    </div>
  );
}
