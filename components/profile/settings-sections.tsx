'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { X } from 'lucide-react';
import { deleteAccount, updateAppearance, updateEmail, updatePassword, updateProfile } from '@/app/actions/profile';
import { unmuteSource } from '@/components/articles/moderation';
import { GoogleButton } from '@/components/auth/google-button';
import { LEDGER_INDEX, type LedgerEntryId } from '@/components/profile/ledger-index';
import { CategoryBadge } from '@/components/articles/category-badge';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { Ornament, type OrnamentName } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { ColorSwatches } from '@/components/ui/color-swatches';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength } from '@/components/ui/password-strength';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { accentVariables } from '@/lib/colors';
import { type ReaderPref, type ReaderPrefValue } from '@/lib/reader-prefs';
import { createClient } from '@/lib/supabase/client';
import type { ActionResult, FontSize } from '@/lib/types';
import { MAX_MUTED_KEYWORDS, normalizeMutedKeyword } from '@/lib/validation';
import { useHydrated } from '@/lib/use-client-value';
import { setReaderPref, useReaderPref } from '@/lib/use-reader-pref';
import { cn } from '@/lib/utils';

/*
 * The Settings page as the Reader's Ledger: each part is an entry on a sheet
 * of ledger paper (styles: .ledger-sheet), with a red margin rule and a folio
 * numeral, laid out in columns on wide screens.
 */


function LedgerEntry({
  id,
  description,
  engraving,
  danger = false,
  children,
}: {
  id: LedgerEntryId;
  description: React.ReactNode;
  engraving?: EngravingName;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const { numeral, title } = LEDGER_INDEX.find((entry) => entry.id === id)!;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('ledger-sheet scroll-mt-24', danger && 'ledger-sheet-danger')}>
      <span className="ledger-numeral" aria-hidden="true">
        {numeral}
      </span>
      <header className="flex items-end justify-between gap-4 border-b-[3px] border-double border-rule/40 pb-4">
        <div className="min-w-0">
          <p className="label text-(--brass-ink)">Folio {numeral}</p>
          <h2 id={`${id}-title`} className={cn('headline mt-1 text-[1.65rem]', danger && 'text-destructive')}>
            {title}
          </h2>
          <p className="mt-1 text-[0.95rem] italic text-muted-foreground">{description}</p>
        </div>
        {engraving && <Engraving name={engraving} className="hidden h-16 max-w-[6.5rem] sm:inline-block" />}
      </header>
      <div className="pt-6">{children}</div>
    </section>
  );
}

/** The foot of an entry or a form: a dashed rule and its buttons on the right. */
function LedgerFoot({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-dashed border-rule/45 pt-5', className)}>{children}</div>;
}

/** A small heading inside an entry, in brass small capitals. */
function SubHead({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  const className = 'label mb-2.5 block text-muted-foreground';
  return htmlFor ? (
    <Label htmlFor={htmlFor} className={className}>
      {children}
    </Label>
  ) : (
    <p className={className}>{children}</p>
  );
}

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

/** Shows a toast for each new action result and refreshes server data on success. */
function useActionFeedback(state: ActionResult | null, onSuccess?: () => void) {
  const { showToast } = useToast();
  const router = useRouter();
  const lastAt = useRef(0);
  useEffect(() => {
    if (!state || state.at === lastAt.current) return;
    lastAt.current = state.at;
    showToast({ type: state.ok ? 'success' : 'error', title: state.message ?? (state.ok ? 'Saved' : 'Something went wrong') });
    if (state.ok) {
      router.refresh();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per result
  }, [state]);
}

// ---------------------------------------------------------------- I. byline

export function ProfileSection({ username, avatarColor, email }: { username: string; avatarColor: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  const [name, setName] = useState(username);
  const [color, setColor] = useState(avatarColor);
  useActionFeedback(state);

  return (
    <LedgerEntry id="byline" description="Your name and the wax of your seal, as they appear at the top of your paper.">
      <form action={action}>
        <div className="grid gap-7 md:grid-cols-[11rem_minmax(0,1fr)]">
          {/* The reader's seal: their initial pressed in wax, as it appears in the header. */}
          <div className="flex flex-col items-center gap-2 text-center md:border-r md:border-rule/30 md:pr-7">
            <ColoredAvatar username={name} color={color} size="xl" />
            <p className="mt-1 max-w-full truncate font-display text-[1.15rem] font-semibold">{name || 'Your name'}</p>
            <p className="max-w-full truncate text-[0.85rem] italic text-muted-foreground">{email}</p>
          </div>
          <div className="min-w-0 space-y-6">
            <div className="max-w-sm">
              <SubHead htmlFor="username">Username</SubHead>
              <Input id="username" name="username" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={30} required />
            </div>
            <div>
              <SubHead>The wax of your seal</SubHead>
              <ColorSwatches value={color} onChange={setColor} label="The wax of your seal" />
              <input type="hidden" name="avatar_color" value={color} />
            </div>
          </div>
        </div>
        <LedgerFoot>
          <SubmitButton disabled={name === username && color === avatarColor}>Save my byline</SubmitButton>
        </LedgerFoot>
      </form>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- II. printing

const EDITIONS: { value: string; label: string; note: string; ornament: OrnamentName }[] = [
  { value: 'light', label: 'Morning', note: 'Cream paper, sepia ink', ornament: 'sun' },
  { value: 'dark', label: 'Night', note: 'Slate paper, brass ink', ornament: 'moon' },
  { value: 'system', label: 'Like my device', note: 'Follows its light or dark', ornament: 'globe' },
];

export function AppearanceSection({ bannerColor, fontSize }: { bannerColor: string; fontSize: FontSize }) {
  const { theme, setTheme } = useTheme();
  // The saved edition is only known in the browser.
  const mounted = useHydrated();
  const [banner, setBanner] = useState(bannerColor);
  const [size, setSize] = useState<FontSize>(fontSize);
  const [state, action] = useActionState(updateAppearance, null);
  useActionFeedback(state);

  // Live preview of the font size; revert to the saved value when leaving the page.
  const savedSize = useRef(fontSize);
  useEffect(() => {
    savedSize.current = fontSize;
  }, [fontSize]);
  useEffect(() => {
    document.documentElement.dataset.fontSize = size;
  }, [size]);
  useEffect(
    () => () => {
      document.documentElement.dataset.fontSize = savedSize.current;
    },
    [],
  );

  return (
    <LedgerEntry id="printing" description="The edition changes at once on this device. Type size and accent ink are kept with your account.">
      <form action={action}>
        <div className="grid gap-8 xl:grid-cols-2 xl:gap-0">
          <div className="space-y-7 xl:border-r xl:border-rule/30 xl:pr-8">
            <div>
              <SubHead>Edition</SubHead>
              <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Edition">
                {EDITIONS.map(({ value, label, note, ornament }) => {
                  const active = mounted && theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-[2px] border-[3px] border-double px-2 py-3.5 text-center transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        active ? 'border-(--ink-gold) bg-(--ink-gold)/14' : 'border-rule/35 bg-card/50 hover:border-rule/60',
                      )}
                    >
                      <Ornament name={ornament} className="h-9" />
                      <span className="font-display text-[1.02rem] font-semibold leading-tight">{label}</span>
                      <span className="hidden text-[0.78rem] italic leading-snug text-muted-foreground sm:block">{note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SubHead>Type size</SubHead>
              <Segmented<FontSize>
                aria-label="Type size"
                value={size}
                onChange={setSize}
                options={[
                  { value: 'small', label: <span className="text-xs">Small</span> },
                  { value: 'medium', label: <span className="text-sm">Medium</span> },
                  { value: 'large', label: <span className="text-base">Large</span> },
                ]}
              />
              <input type="hidden" name="font_size" value={size} />
            </div>
          </div>

          <div className="space-y-4 xl:pl-8">
            <SubHead>Accent ink</SubHead>
            {/* A proof of the ink on a slip of the paper. */}
            <div className="card-paper px-4 py-3" style={accentVariables(banner)} data-accent="" aria-hidden="true">
              <p className="kicker">World · A proof</p>
              <p className="headline mt-1 text-lg">Section labels are printed in this ink</p>
            </div>
            <ColorSwatches value={banner} onChange={setBanner} label="Accent ink" />
            <input type="hidden" name="banner_color" value={banner} />
          </div>
        </div>
        <LedgerFoot>
          <SubmitButton disabled={banner === bannerColor && size === fontSize}>Save the printing</SubmitButton>
        </LedgerFoot>
      </form>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- III. reading room

type PrefSlip<K extends ReaderPref> = {
  name: K;
  title: string;
  note: string;
  options: { value: ReaderPrefValue<K>; label: string }[];
};

/** One reading preference on a slip: what it does, and its choices. Applies at once on this device. */
function PrefSlipRow<K extends ReaderPref>({ slip }: { slip: PrefSlip<K> }) {
  const value = useReaderPref(slip.name);
  return (
    <div className="flex flex-col gap-3 border-b border-rule/25 pb-5 last:border-b-0 last:pb-0 md:[&:nth-last-child(2)]:border-b-0 md:[&:nth-last-child(2)]:pb-0">
      <div>
        <p className="font-display text-[1.1rem] font-semibold">{slip.title}</p>
        <p className="mt-0.5 text-[0.9rem] italic leading-snug text-muted-foreground">{slip.note}</p>
      </div>
      <Segmented<ReaderPrefValue<K>>
        aria-label={slip.title}
        className="self-start"
        value={value}
        onChange={(next) => setReaderPref(slip.name, next)}
        options={slip.options}
      />
    </div>
  );
}

const CLOCK_SLIP: PrefSlip<'clock'> = {
  name: 'clock',
  title: 'The clock',
  note: 'The local time on the front page and the times on stories: 3:42 p.m. or 15:42.',
  options: [
    { value: '12', label: '12-hour' },
    { value: '24', label: '24-hour' },
  ],
};
const BANNER_SLIP: PrefSlip<'banner'> = {
  name: 'banner',
  title: 'The street under the masthead',
  note: 'The townsfolk, the cab and the gas lamps. Still keeps the picture; Hidden leaves a plain broadsheet.',
  options: [
    { value: 'moving', label: 'Moving' },
    { value: 'still', label: 'Still' },
    { value: 'hidden', label: 'Hidden' },
  ],
};
const PHOTOS_SLIP: PrefSlip<'photos'> = {
  name: 'photos',
  title: 'News photographs',
  note: 'Archival prints a little faded and warm, clearing when you point at a story; or every photograph in its natural colours.',
  options: [
    { value: 'archival', label: 'Archival' },
    { value: 'natural', label: 'Natural colours' },
  ],
};
const COLUMNS_SLIP: PrefSlip<'columns'> = {
  name: 'columns',
  title: 'Text columns',
  note: 'Justified like a printed column, or with a ragged right edge, which some readers find easier to follow.',
  options: [
    { value: 'justified', label: 'Justified' },
    { value: 'ragged', label: 'Ragged right' },
  ],
};

export function ReadingRoomSection() {
  return (
    <LedgerEntry
      id="reading-room"
      engraving="typewriter"
      description="How the paper reads on this device. Changes show at once and are remembered here, like the edition."
    >
      <div className="grid gap-5 md:grid-cols-2 md:gap-x-10 md:gap-y-6">
        <PrefSlipRow slip={CLOCK_SLIP} />
        <PrefSlipRow slip={BANNER_SLIP} />
        <PrefSlipRow slip={PHOTOS_SLIP} />
        <PrefSlipRow slip={COLUMNS_SLIP} />
      </div>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- IV. sections and papers

/**
 * Muted words: stories whose headline or summary contains one of them (as a
 * whole word) never appear on the front page. Saved straight away, one by one.
 */
function MutedWords({ userId, initialKeywords }: { userId: string; initialKeywords: string[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = normalizeMutedKeyword(draft);
    if ('error' in result) {
      setProblem(result.error);
      return;
    }
    if (keywords.includes(result.keyword)) {
      setProblem(`“${result.keyword}” is already muted.`);
      return;
    }
    if (keywords.length >= MAX_MUTED_KEYWORDS) {
      setProblem(`You can mute at most ${MAX_MUTED_KEYWORDS} words. Unmute one first.`);
      return;
    }
    setBusy(true);
    const { error } = await createClient().from('muted_keywords').insert({ user_id: userId, keyword: result.keyword });
    setBusy(false);
    if (error) {
      showToast({ type: 'error', title: 'Could not mute that word', message: error.message });
      return;
    }
    setKeywords((list) => [...list, result.keyword].sort());
    setDraft('');
    setProblem(null);
    showToast({ type: 'success', title: `“${result.keyword}” muted`, message: 'Stories that mention it will not appear on your front page.' });
  };

  const remove = async (keyword: string) => {
    setKeywords((list) => list.filter((k) => k !== keyword));
    const { error } = await createClient().from('muted_keywords').delete().eq('user_id', userId).eq('keyword', keyword);
    if (error) {
      setKeywords((list) => [...list, keyword].sort());
      showToast({ type: 'error', title: 'Could not unmute', message: error.message });
    }
  };

  return (
    <div>
      <SubHead htmlFor="muted-word">Muted words</SubHead>
      <p className="mb-3 text-[0.95rem] italic text-muted-foreground">
        Stories that mention one of these words in the headline or summary are left off your front page.
      </p>
      <form onSubmit={add} className="flex flex-wrap items-start gap-2.5">
        <div className="min-w-0 flex-1 basis-56">
          <Input
            id="muted-word"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setProblem(null);
            }}
            maxLength={40}
            placeholder="A word or name, e.g. football"
            autoComplete="off"
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? 'muted-word-problem' : undefined}
          />
          {problem && (
            <p id="muted-word-problem" role="alert" className="mt-1.5 text-[0.88rem] text-destructive">
              {problem}
            </p>
          )}
        </div>
        <Button type="submit" variant="outline" disabled={busy || !draft.trim()}>
          {busy && <Spinner />}
          Mute word
        </Button>
      </form>
      {keywords.length === 0 ? (
        <p className="mt-4 text-[0.95rem] italic text-muted-foreground">No muted words yet.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Your muted words">
          {keywords.map((keyword) => (
            <li key={keyword} className="inline-flex items-center gap-1 rounded-[2px] border border-dashed border-rule/60 bg-card/60 py-0.5 pl-2.5 pr-1 font-display text-[0.98rem]">
              {keyword}
              <button
                type="button"
                onClick={() => remove(keyword)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                aria-label={`Unmute “${keyword}”`}
                title="Unmute"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SectionsAndSourcesSection({
  topics,
  userId,
  sources,
  keywords,
}: {
  topics: string[];
  userId: string;
  sources: { id: string; name: string }[];
  keywords: string[];
}) {
  const [list, setList] = useState(sources);
  const { showToast } = useToast();

  const unmute = async (source: { id: string; name: string }) => {
    setList((current) => current.filter((s) => s.id !== source.id));
    const { error } = await unmuteSource(userId, source.id);
    if (error) {
      setList((current) => [...current, source]);
      showToast({ type: 'error', title: 'Could not unmute', message: error.message });
    } else {
      showToast({ type: 'success', title: `${source.name} unmuted` });
    }
  };

  return (
    <LedgerEntry id="sections" description="What your front page shows by default, and the newspapers and words you never want to see.">
      <div className="grid gap-8 md:grid-cols-2 md:gap-0">
        <div className="md:border-r md:border-rule/30 md:pr-8">
          <SubHead>Your sections</SubHead>
          <div className="flex flex-wrap gap-2">
            {topics.length === 0 ? (
              <p className="text-[0.95rem] italic text-muted-foreground">No sections chosen, so your paper includes everything.</p>
            ) : (
              topics.map((name) => <CategoryBadge key={name} name={name} />)
            )}
          </div>
          <Button variant="outline" asChild className="mt-5">
            <Link href="/onboarding">Edit my sections</Link>
          </Button>
        </div>
        <div className="md:pl-8">
          <SubHead>Muted newspapers</SubHead>
          {list.length === 0 ? (
            <p className="text-[0.95rem] italic text-muted-foreground">
              You have not muted any newspapers. To mute one, use More under any of its stories.
            </p>
          ) : (
            <ul className="divide-y divide-dashed divide-rule/40 border-y border-rule/40">
              {list.map((source) => (
                <li key={source.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-display text-[1rem] font-semibold">{source.name}</span>
                  <Button variant="stamp" size="sm" onClick={() => unmute(source)}>
                    Unmute
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-8 border-t border-dashed border-rule/45 pt-6">
        <MutedWords userId={userId} initialKeywords={keywords} />
      </div>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- V. signing in

function EmailForm({ email }: { email: string }) {
  const [state, action] = useActionState(updateEmail, null);
  useActionFeedback(state);
  return (
    <form action={action} className="flex h-full flex-col">
      <SubHead htmlFor="new-email">Email address</SubHead>
      <p className="mb-3 text-[0.92rem] italic text-muted-foreground">
        Now <span className="font-medium not-italic text-foreground">{email}</span>. A change is confirmed by email.
      </p>
      <Input id="new-email" name="email" type="email" autoComplete="email" placeholder="new@example.com" required />
      <LedgerFoot className="mt-auto pt-5">
        <SubmitButton>Change email</SubmitButton>
      </LedgerFoot>
    </form>
  );
}

function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [next, setNext] = useState('');
  const [state, action] = useActionState(updatePassword, null);
  useActionFeedback(state, () => {
    formRef.current?.reset();
    setNext('');
  });
  return (
    <form ref={formRef} action={action}>
      <p className="label mb-1 block text-muted-foreground">Password</p>
      <p className="mb-3 text-[0.92rem] italic text-muted-foreground">At least 8 characters. A long passphrase is best.</p>
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput id="current-password" name="current_password" autoComplete="current-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            name="new_password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PasswordStrength password={next} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">Confirm new password</Label>
          <PasswordInput id="confirm-new-password" name="confirm_password" autoComplete="new-password" required minLength={8} />
        </div>
      </div>
      <LedgerFoot>
        <SubmitButton>Change password</SubmitButton>
      </LedgerFoot>
    </form>
  );
}

/** Email and password side by side; readers who sign in with Google get a note instead. */
export function SigningInSection({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  return (
    <LedgerEntry
      id="signing-in"
      description={hasPassword ? 'The address your account belongs to, and your password.' : 'How you get into your paper.'}
    >
      {hasPassword ? (
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
          <div className="lg:border-r lg:border-rule/30 lg:pr-8">
            <EmailForm email={email} />
          </div>
          <div className="lg:pl-8">
            <PasswordForm />
          </div>
        </div>
      ) : (
        <p className="max-w-2xl text-[1rem] leading-relaxed">
          You sign in with your Google account{email ? (
            <>
              {' '}
              <span className="font-semibold">{email}</span>
            </>
          ) : null}
          . There is no separate password for this site, so there is nothing to remember or change here.
        </p>
      )}
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- VI. closing the account

/**
 * Accounts with a password confirm with it. Google-only accounts must have signed
 * in with Google in the last few minutes; otherwise they are sent to Google once
 * and come back here (`?delete=confirm`) with the dialog open again.
 */
export function DangerZone({ hasPassword, openOnLoad = false }: { hasPassword: boolean; openOnLoad?: boolean }) {
  const [open, setOpen] = useState(openOnLoad);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsGoogle, setNeedsGoogle] = useState(false);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError(null);
    setNeedsGoogle(false);
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // On success the server redirects to the front page, so this only returns on failure.
    const result = await deleteAccount(hasPassword ? password : null);
    setBusy(false);
    if (result && !result.ok) {
      setError(result.message ?? 'Could not delete the account.');
      setNeedsGoogle(Boolean(result.needsGoogle));
    }
  };

  return (
    <LedgerEntry id="close" danger description="Permanently deletes your account, your saved stories, folders and notes. This cannot be undone.">
      <div className="flex justify-end">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <form onSubmit={confirm} className="grid min-w-0 grid-cols-1 gap-4">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                Everything you saved, with your folders and notes, will be removed for good.
                {hasPassword && ' Enter your password to confirm it is really you.'}
              </DialogDescription>
            </DialogHeader>
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-account-password">Your password</Label>
                <PasswordInput
                  id="delete-account-password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {needsGoogle && <GoogleButton next="/profile?delete=confirm" label="Confirm with Google" />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancel
              </Button>
              {!needsGoogle && (
                <Button type="submit" variant="destructive" disabled={busy || (hasPassword && password.length === 0)}>
                  {busy && <Spinner />}
                  Delete account
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </LedgerEntry>
  );
}
