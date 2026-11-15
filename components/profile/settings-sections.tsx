'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { X } from 'lucide-react';
import { deleteAccount, updateAppearance, updateEmail, updatePassword, updateProfile } from '@/app/actions/profile';
import { unmuteSource } from '@/components/articles/moderation';
import { GoogleButton } from '@/components/auth/google-button';
import { LEDGER_INDEX, type LedgerEntryId } from '@/components/profile/ledger-index';
import { CategoryBadge } from '@/components/articles/category-badge';
import { EditionMark } from '@/components/site/edition-stamp';
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
import { LOCALE_INFO, LOCALES, type Locale } from '@/lib/i18n/config';
import { useChangeLocale, useI18n } from '@/lib/i18n/client';
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
  const { numeral } = LEDGER_INDEX.find((entry) => entry.id === id)!;
  const { t, fmt } = useI18n();
  const title = t.settings.entries[id];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('ledger-sheet scroll-mt-24', danger && 'ledger-sheet-danger')}>
      <span className="ledger-numeral" aria-hidden="true">
        {numeral}
      </span>
      <header className="flex items-end justify-between gap-4 border-b-[3px] border-double border-rule/40 pb-4">
        <div className="min-w-0">
          <p className="label text-(--brass-ink)">{fmt(t.settings.folio, { n: numeral })}</p>
          <h2 id={`${id}-title`} className={cn('headline mt-1 text-[1.65rem]', danger && 'text-destructive')}>
            {title}
          </h2>
          <p className="mt-1 text-pretty text-[0.95rem] italic text-muted-foreground">{description}</p>
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

/**
 * Shows a toast for each new action result. No router.refresh(): the actions
 * that change what the page shows call revalidatePath, so their response
 * already carries the fresh page (refreshing again rendered it twice).
 */
function useActionFeedback(state: ActionResult | null, onSuccess?: () => void) {
  const { showToast } = useToast();
  const lastAt = useRef(0);
  const { t } = useI18n();
  useEffect(() => {
    if (!state || state.at === lastAt.current) return;
    lastAt.current = state.at;
    showToast({ type: state.ok ? 'success' : 'error', title: state.message ?? (state.ok ? t.common.saved : t.common.somethingWrong) });
    if (state.ok) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per result
  }, [state]);
}

// ---------------------------------------------------------------- I. byline

export function ProfileSection({ username, avatarColor, email }: { username: string; avatarColor: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  const [name, setName] = useState(username);
  const [color, setColor] = useState(avatarColor);
  useActionFeedback(state);
  const w = useI18n().t.settings.byline;

  return (
    <LedgerEntry id="byline" description={w.description}>
      <form action={action}>
        <div className="grid gap-7 md:grid-cols-[11rem_minmax(0,1fr)]">
          {/* The reader's seal: their initial pressed in wax, as it appears in the header. */}
          <div className="flex flex-col items-center gap-2 text-center md:border-r md:border-rule/30 md:pr-7">
            <ColoredAvatar username={name} color={color} size="xl" />
            <p className="mt-1 max-w-full truncate font-display text-[1.15rem] font-semibold">{name || w.yourName}</p>
            <p className="max-w-full truncate text-[0.85rem] italic text-muted-foreground">{email}</p>
          </div>
          <div className="min-w-0 space-y-6">
            <div className="max-w-sm">
              <SubHead htmlFor="username">{w.username}</SubHead>
              <Input id="username" name="username" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={30} required />
            </div>
            <div>
              <SubHead>{w.wax}</SubHead>
              <ColorSwatches value={color} onChange={setColor} label={w.wax} />
              <input type="hidden" name="avatar_color" value={color} />
            </div>
          </div>
        </div>
        <LedgerFoot>
          <SubmitButton disabled={name === username && color === avatarColor}>{w.save}</SubmitButton>
        </LedgerFoot>
      </form>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- II. printing

const EDITIONS: { value: 'light' | 'dark' | 'system'; ornament: OrnamentName }[] = [
  { value: 'light', ornament: 'sun' },
  { value: 'dark', ornament: 'moon' },
  { value: 'system', ornament: 'globe' },
];

/** A choice printed as a card in a double rule (the edition, its language): brass-washed when chosen. */
const choiceCard = (active: boolean) =>
  cn(
    // min-w-0 and hyphenation: three cards share a phone's width even with "Como mi dispositivo".
    'flex min-w-0 flex-col items-center gap-1.5 rounded-[2px] border-[3px] border-double px-2 py-3.5 text-center hyphens-auto break-words transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    active ? 'border-(--ink-gold) bg-(--ink-gold)/14' : 'border-rule/35 bg-card/50 hover:border-rule/60',
  );

/** The language of the paper, as a card per edition with its stamp and flag; applies at once on this device. */
function LanguageChoice() {
  const { t, locale } = useI18n();
  const { change, pending } = useChangeLocale();
  const w = t.settings.printing;
  return (
    <div>
      <SubHead>{w.language}</SubHead>
      {/* Five cards: two a row on phones (the last one spans both), three on tablets, all five on a wide screen. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label={w.language} aria-busy={pending}>
        {LOCALES.map((code: Locale) => {
          const info = LOCALE_INFO[code];
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !active && change(code)}
              className={cn(choiceCard(active), 'edition-card last:odd:col-span-2 sm:last:odd:col-span-1')}
            >
              <EditionMark code={code} active={active} className="edition-mark-card mb-0.5" />
              <span lang={info.htmlLang} className="font-display text-[1rem] font-semibold leading-tight text-balance">
                {info.edition}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[0.85rem] italic text-muted-foreground">{w.languageNote}</p>
    </div>
  );
}

export function AppearanceSection({ bannerColor, fontSize }: { bannerColor: string; fontSize: FontSize }) {
  const { theme, setTheme } = useTheme();
  // The saved edition is only known in the browser.
  const mounted = useHydrated();
  const [banner, setBanner] = useState(bannerColor);
  const [size, setSize] = useState<FontSize>(fontSize);
  const [state, action] = useActionState(updateAppearance, null);
  useActionFeedback(state);
  const w = useI18n().t.settings.printing;

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
    <LedgerEntry id="printing" description={w.description}>
      <form action={action}>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-0">
          <div className="space-y-7 xl:border-r xl:border-rule/30 xl:pr-8">
            <div>
              <SubHead>{w.edition}</SubHead>
              <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label={w.edition}>
                {EDITIONS.map(({ value, ornament }) => {
                  const active = mounted && theme === value;
                  return (
                    <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setTheme(value)} className={choiceCard(active)}>
                      <Ornament name={ornament} className="h-9" />
                      <span className="font-display text-[1.02rem] font-semibold leading-tight text-balance">{w.themes[value].label}</span>
                      <span className="hidden text-[0.78rem] italic leading-snug text-muted-foreground sm:block">{w.themes[value].note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <LanguageChoice />

            <div>
              <SubHead>{w.typeSize}</SubHead>
              <Segmented<FontSize>
                aria-label={w.typeSize}
                value={size}
                onChange={setSize}
                options={[
                  { value: 'small', label: <span className="text-xs">{w.sizes.small}</span> },
                  { value: 'medium', label: <span className="text-sm">{w.sizes.medium}</span> },
                  { value: 'large', label: <span className="text-base">{w.sizes.large}</span> },
                ]}
              />
              <input type="hidden" name="font_size" value={size} />
            </div>
          </div>

          <div className="space-y-4 xl:pl-8">
            <SubHead>{w.accent}</SubHead>
            {/* A proof of the ink on a slip of the paper. */}
            <div className="card-paper px-4 py-3" style={accentVariables(banner)} data-accent="" aria-hidden="true">
              <p className="kicker">{w.proofKicker}</p>
              <p className="headline mt-1 text-lg">{w.proofHeadline}</p>
            </div>
            <ColorSwatches value={banner} onChange={setBanner} label={w.accent} />
            <input type="hidden" name="banner_color" value={banner} />
          </div>
        </div>
        <LedgerFoot>
          <SubmitButton disabled={banner === bannerColor && size === fontSize}>{w.save}</SubmitButton>
        </LedgerFoot>
      </form>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- III. reading room

/** The reading preferences on their slips, in order; their words are in settings.reading.<name>. */
const PREF_SLIPS: { [K in ReaderPref]: { name: K; values: ReaderPrefValue<K>[] } }[ReaderPref][] = [
  { name: 'clock', values: ['12', '24'] },
  { name: 'banner', values: ['moving', 'still', 'hidden'] },
  { name: 'photos', values: ['archival', 'natural'] },
  { name: 'columns', values: ['justified', 'ragged'] },
];

/** One reading preference on a slip: what it does, and its choices. Applies at once on this device. */
function PrefSlipRow<K extends ReaderPref>({ name, values }: { name: K; values: ReaderPrefValue<K>[] }) {
  const value = useReaderPref(name);
  const slip = useI18n().t.settings.reading[name] as { title: string; note: string; options: Record<string, string> };
  return (
    <div className="flex flex-col gap-3 border-b border-rule/25 pb-5 last:border-b-0 last:pb-0 md:[&:nth-last-child(2)]:border-b-0 md:[&:nth-last-child(2)]:pb-0">
      <div>
        <p className="font-display text-[1.1rem] font-semibold">{slip.title}</p>
        <p className="mt-0.5 text-pretty text-[0.9rem] italic leading-snug text-muted-foreground">{slip.note}</p>
      </div>
      <Segmented<ReaderPrefValue<K>>
        aria-label={slip.title}
        className="max-w-full self-start"
        value={value}
        onChange={(next) => setReaderPref(name, next)}
        options={values.map((option) => ({ value: option, label: slip.options[option] }))}
      />
    </div>
  );
}

export function ReadingRoomSection() {
  const { t } = useI18n();
  return (
    <LedgerEntry id="reading-room" engraving="typewriter" description={t.settings.reading.description}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-10 md:gap-y-6">
        {PREF_SLIPS.map((slip) => (
          <PrefSlipRow key={slip.name} name={slip.name} values={slip.values as ReaderPrefValue<typeof slip.name>[]} />
        ))}
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
  const { t, fmt } = useI18n();
  const w = t.settings.sections;

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = normalizeMutedKeyword(draft, t.validation);
    if ('error' in result) {
      setProblem(result.error);
      return;
    }
    if (keywords.includes(result.keyword)) {
      setProblem(fmt(w.alreadyMuted, { word: result.keyword }));
      return;
    }
    if (keywords.length >= MAX_MUTED_KEYWORDS) {
      setProblem(fmt(w.tooManyWords, { max: MAX_MUTED_KEYWORDS }));
      return;
    }
    setBusy(true);
    const { error } = await createClient().from('muted_keywords').insert({ user_id: userId, keyword: result.keyword });
    setBusy(false);
    if (error) {
      showToast({ type: 'error', title: w.muteWordFailed, message: error.message });
      return;
    }
    setKeywords((list) => [...list, result.keyword].sort());
    setDraft('');
    setProblem(null);
    showToast({ type: 'success', title: fmt(w.wordMuted, { word: result.keyword }), message: w.wordMutedNote });
  };

  const remove = async (keyword: string) => {
    setKeywords((list) => list.filter((k) => k !== keyword));
    const { error } = await createClient().from('muted_keywords').delete().eq('user_id', userId).eq('keyword', keyword);
    if (error) {
      setKeywords((list) => [...list, keyword].sort());
      showToast({ type: 'error', title: w.unmuteFailed, message: error.message });
    }
  };

  return (
    <div>
      <SubHead htmlFor="muted-word">{w.mutedWords}</SubHead>
      <p className="mb-3 text-pretty text-[0.95rem] italic text-muted-foreground">{w.mutedWordsNote}</p>
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
            placeholder={w.wordPlaceholder}
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
          {w.muteWord}
        </Button>
      </form>
      {keywords.length === 0 ? (
        <p className="mt-4 text-[0.95rem] italic text-muted-foreground">{w.noWords}</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={w.yourWords}>
          {keywords.map((keyword) => (
            <li key={keyword} className="inline-flex items-center gap-1 rounded-[2px] border border-dashed border-rule/60 bg-card/60 py-0.5 pl-2.5 pr-1 font-display text-[0.98rem]">
              {keyword}
              <button
                type="button"
                onClick={() => remove(keyword)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                aria-label={fmt(w.unmuteWord, { word: keyword })}
                title={w.unmute}
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
  const { t, fmt } = useI18n();
  const w = t.settings.sections;

  const unmute = async (source: { id: string; name: string }) => {
    setList((current) => current.filter((s) => s.id !== source.id));
    const { error } = await unmuteSource(userId, source.id);
    if (error) {
      setList((current) => [...current, source]);
      showToast({ type: 'error', title: w.unmuteFailed, message: error.message });
    } else {
      showToast({ type: 'success', title: fmt(w.unmuted, { name: source.name }) });
    }
  };

  return (
    <LedgerEntry id="sections" description={w.description}>
      <div className="grid gap-8 md:grid-cols-2 md:gap-0">
        <div className="md:border-r md:border-rule/30 md:pr-8">
          <SubHead>{w.yours}</SubHead>
          <div className="flex flex-wrap gap-2">
            {topics.length === 0 ? (
              <p className="text-[0.95rem] italic text-muted-foreground">{w.none}</p>
            ) : (
              topics.map((name) => <CategoryBadge key={name} name={name} />)
            )}
          </div>
          <Button variant="outline" asChild className="mt-5">
            <Link href="/onboarding">{w.edit}</Link>
          </Button>
        </div>
        <div className="md:pl-8">
          <SubHead>{w.mutedPapers}</SubHead>
          {list.length === 0 ? (
            <p className="text-pretty text-[0.95rem] italic text-muted-foreground">{w.noMutedPapers}</p>
          ) : (
            <ul className="divide-y divide-dashed divide-rule/40 border-y border-rule/40">
              {list.map((source) => (
                <li key={source.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-display text-[1rem] font-semibold">{source.name}</span>
                  <Button variant="stamp" size="sm" onClick={() => unmute(source)}>
                    {w.unmute}
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
  const { t, rich } = useI18n();
  const w = t.settings.signingIn;
  return (
    <form action={action} className="flex h-full flex-col">
      <SubHead htmlFor="new-email">{w.email}</SubHead>
      <p className="mb-3 text-[0.92rem] italic text-muted-foreground">
        {rich(w.emailNow, { email: <span className="break-all font-medium not-italic text-foreground">{email}</span> })}
      </p>
      <Input id="new-email" name="email" type="email" autoComplete="email" placeholder="new@example.com" required />
      <LedgerFoot className="mt-auto pt-5">
        <SubmitButton>{w.changeEmail}</SubmitButton>
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
  const w = useI18n().t.settings.signingIn;
  return (
    <form ref={formRef} action={action}>
      <p className="label mb-1 block text-muted-foreground">{w.password}</p>
      <p className="mb-3 text-[0.92rem] italic text-muted-foreground">{w.passwordHint}</p>
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">{w.current}</Label>
          <PasswordInput id="current-password" name="current_password" autoComplete="current-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">{w.new}</Label>
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
          <Label htmlFor="confirm-new-password">{w.confirmNew}</Label>
          <PasswordInput id="confirm-new-password" name="confirm_password" autoComplete="new-password" required minLength={8} />
        </div>
      </div>
      <LedgerFoot>
        <SubmitButton>{w.changePassword}</SubmitButton>
      </LedgerFoot>
    </form>
  );
}

/** Email and password side by side; readers who sign in with Google get a note instead. */
export function SigningInSection({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const { t, rich } = useI18n();
  const w = t.settings.signingIn;
  return (
    <LedgerEntry id="signing-in" description={hasPassword ? w.description : w.descriptionGoogle}>
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
        <p className="max-w-2xl text-pretty text-[1rem] leading-relaxed">
          {rich(w.google, {
            email: email ? (
              <>
                {' '}
                <span className="break-all font-semibold">{email}</span>
              </>
            ) : null,
          })}
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
  const { t } = useI18n();
  const w = t.settings.close;

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
      setError(result.message ?? w.failed);
      setNeedsGoogle(Boolean(result.needsGoogle));
    }
  };

  return (
    <LedgerEntry id="close" danger description={w.description}>
      <div className="flex justify-end">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {w.button}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <form onSubmit={confirm} className="grid min-w-0 grid-cols-1 gap-4">
            <DialogHeader>
              <DialogTitle>{w.title}</DialogTitle>
              <DialogDescription>
                {w.note}
                {hasPassword && w.notePassword}
              </DialogDescription>
            </DialogHeader>
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-account-password">{w.password}</Label>
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
            {needsGoogle && <GoogleButton next="/profile?delete=confirm" label={w.google} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                {t.common.cancel}
              </Button>
              {!needsGoogle && (
                <Button type="submit" variant="destructive" disabled={busy || (hasPassword && password.length === 0)}>
                  {busy && <Spinner />}
                  {w.confirm}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </LedgerEntry>
  );
}
