'use client';

import { createContext, useActionState, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useTheme } from '@/components/site/theme-provider';
import type { ThemeChoice } from '@/lib/theme';
import { deleteAccount, saveAccentInk, saveFontSize, updateProfile } from '@/app/actions/profile';
import { muteSource, unhideArticle, unmuteSource } from '@/components/articles/moderation';
import { GoogleButton } from '@/components/auth/google-button';
import { ledgerIndex, type LedgerEntryId, type LedgerIndex } from '@/components/profile/ledger-index';
import { CategoryBadge } from '@/components/articles/category-badge';
import { Engraving, type EngravingName } from '@/components/site/engraving';
import { Ornament, type OrnamentName } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { ColorSwatches } from '@/components/ui/color-swatches';
import { ColoredAvatar } from '@/components/ui/colored-avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { errorText } from '@/lib/error-text';
import { GUEST_MAX_MUTED_WORDS, guestMutedWordsFit } from '@/lib/guest';
import { applyAccent, applyFontSize, readGuestMutes, saveGuestAccent, saveGuestFontSize, saveGuestMutes } from '@/lib/guest-prefs';
import { sectionText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import { getCategoryStyle } from '@/lib/category-styles';
import { formatClock, type ReaderPref, type ReaderPrefValue } from '@/lib/reader-prefs';
import { createClient } from '@/lib/supabase/client';
import type { ActionResult, Category, FontSize, SourceOption } from '@/lib/types';
import { MAX_MUTED_KEYWORDS, normalizeMutedKeyword } from '@/lib/validation';
import { useClientValue, useHydrated } from '@/lib/use-client-value';
import { setReaderPref, useReaderPref } from '@/lib/use-reader-pref';
import { cleanText } from '@/lib/text';
import { cn } from '@/lib/utils';
import { SECTIONS_PATH, SETTINGS_PATH } from '@/lib/routes';
import { SheetLink } from '@/components/story/sheet-link';

/*
 * The Settings page as the Reader's Ledger: each part is an entry on a sheet
 * of ledger paper (styles: .ledger-sheet), with a red margin rule and a folio
 * numeral, laid out in columns on wide screens. Visitors without an account
 * get the entries kept in their browser only (components/profile/ledger-index.ts).
 */

const LedgerContext = createContext<LedgerIndex>(ledgerIndex(false));

/** The entries on the page and their numerals: all six for an account, three for a visitor. */
export function Ledger({ guest, children }: { guest: boolean; children: React.ReactNode }) {
  const index = useMemo(() => ledgerIndex(guest), [guest]);
  return <LedgerContext.Provider value={index}>{children}</LedgerContext.Provider>;
}

function LedgerEntry({
  id,
  description,
  engraving,
  danger = false,
  children,
}: {
  id: LedgerEntryId;
  /** Only where a choice needs a warning (deleting the account); the rest speak for themselves. */
  description?: React.ReactNode;
  engraving?: EngravingName;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const numeral = useContext(LedgerContext).find((entry) => entry.id === id)?.numeral ?? '';
  const { t } = useI18n();
  const title = t.settings.entries[id];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('ledger-sheet scroll-mt-24', danger && 'ledger-sheet-danger')}>
      <span className="ledger-numeral" aria-hidden="true">
        {numeral}
      </span>
      <header className="flex items-end justify-between gap-4 border-b-[3px] border-double border-rule/40 pb-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className={cn('headline text-[1.65rem]', danger && 'text-destructive')}>
            {title}
          </h2>
          {description && <p className="mt-1 text-pretty text-[0.95rem] italic text-muted-foreground">{description}</p>}
        </div>
        {engraving && <Engraving name={engraving} className="hidden h-16 max-w-[6.5rem] sm:inline-block" />}
      </header>
      <div className="pt-6">{children}</div>
    </section>
  );
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

// ---------------------------------------------------------------- I. byline

/**
 * The account: the reader's seal (their initial, in their accent ink: Appearance) and their name, which is
 * the only thing to change here. The result shows beside the button, not as a notice.
 */
export function ProfileSection({ username, email }: { username: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  const [name, setName] = useState(username);
  // What the last save said, until the name is edited again.
  const [shownAt, setShownAt] = useState(0);
  const w = useI18n().t.settings.byline;
  const result = state && state.at !== shownAt ? state : null;

  return (
    <LedgerEntry id="byline">
      <form action={action} className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        <div className="flex items-center gap-4 sm:flex-col sm:gap-2 sm:text-center">
          <ColoredAvatar username={name} size="xl" className="h-16 w-16 text-[2rem] sm:h-20 sm:w-20 sm:text-[2.5rem]" />
          <p className="min-w-0 max-w-[14rem] truncate text-[0.88rem] italic text-muted-foreground">{email}</p>
        </div>
        <div className="min-w-0 flex-1">
          <SubHead htmlFor="username">{w.username}</SubHead>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="username"
              name="username"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (state) setShownAt(state.at);
              }}
              minLength={3}
              maxLength={30}
              required
              className="max-w-sm flex-1 basis-48"
            />
            <SubmitButton disabled={name.trim() === username}>{w.save}</SubmitButton>
          </div>
          {result && (
            <p role={result.ok ? 'status' : 'alert'} className={cn('mt-2 text-[0.92rem]', result.ok ? 'text-muted-foreground' : 'text-destructive')}>
              {result.ok ? `✓ ${result.message ?? w.saved}` : result.message}
            </p>
          )}
        </div>
      </form>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- II. printing

const EDITIONS: { value: ThemeChoice; ornament: OrnamentName }[] = [
  { value: 'light', ornament: 'sun' },
  { value: 'dark', ornament: 'moon' },
  { value: 'auto', ornament: 'watch-case' },
];

/**
 * The edition, type size and ink. Every choice applies the moment
 * it is made: for an account the type size and ink are saved to it straight
 * away; a visitor's are kept in this browser (lib/guest-prefs.ts).
 */
export function AppearanceSection({ bannerColor, fontSize, guest = false }: { bannerColor: string; fontSize: FontSize; guest?: boolean }) {
  const { theme, setTheme } = useTheme();
  // The saved edition is only known in the browser.
  const mounted = useHydrated();
  const [banner, setBanner] = useState(bannerColor);
  const [size, setSize] = useState<FontSize>(fontSize);
  const { showToast } = useToast();
  const { t } = useI18n();
  const w = t.settings.printing;
  const failed = (result: ActionResult) => showToast({ type: 'error', title: result.message || t.common.somethingWrong });

  const chooseSize = async (next: FontSize) => {
    const previous = size;
    setSize(next);
    if (guest) {
      saveGuestFontSize(next);
      return;
    }
    applyFontSize(next);
    const result = await saveFontSize(next);
    if (!result.ok) {
      setSize(previous);
      applyFontSize(previous);
      failed(result);
    }
  };

  // The colour picker sends a new ink at every move of the pointer: the page follows at once,
  // and the account is written once the ink has settled (or when the reader leaves the page).
  const inkTimer = useRef<number | undefined>(undefined);
  const unsavedInk = useRef<string | null>(null);
  const saveInk = async () => {
    const ink = unsavedInk.current;
    unsavedInk.current = null;
    if (!ink) return;
    const result = await saveAccentInk(ink);
    if (!result.ok) failed(result);
  };
  const chooseInk = (next: string) => {
    setBanner(next);
    if (guest) {
      saveGuestAccent(next);
      return;
    }
    applyAccent(next);
    unsavedInk.current = next;
    window.clearTimeout(inkTimer.current);
    inkTimer.current = window.setTimeout(() => void saveInk(), 600);
  };
  useEffect(
    () => () => {
      window.clearTimeout(inkTimer.current);
      if (unsavedInk.current) void saveAccentInk(unsavedInk.current);
    },
    [],
  );

  return (
    <LedgerEntry id="printing">
      <div>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-0">
          <div className="space-y-7 xl:border-r xl:border-rule/30 xl:pr-8">
            <div>
              <SubHead>{w.edition}</SubHead>
              {/* The same kind of control as Type size and Reading: the emblem above the name, in equal parts. */}
              <Segmented<ThemeChoice>
                fill
                even
                aria-label={w.edition}
                // The saved edition is known only in the browser: nothing is marked until then.
                value={(mounted ? theme : '') as ThemeChoice}
                onChange={setTheme}
                options={EDITIONS.map(({ value, ornament }) => ({
                  value,
                  label: w.themes[value].label,
                  preview: <Ornament name={ornament} className="h-7 max-w-9" />,
                }))}
              />
              {mounted && theme === 'auto' && <p className="mt-2 text-[0.85rem] italic text-muted-foreground">{w.themes.auto.note}</p>}
            </div>

            <div>
              <SubHead>{w.typeSize}</SubHead>
              <Segmented<FontSize>
                fill
                even
                aria-label={w.typeSize}
                value={size}
                onChange={(next) => void chooseSize(next)}
                options={[
                  { value: 'small', label: w.sizes.small, preview: <TypeSpecimen size="small" /> },
                  { value: 'medium', label: w.sizes.medium, preview: <TypeSpecimen size="medium" /> },
                  { value: 'large', label: w.sizes.large, preview: <TypeSpecimen size="large" /> },
                ]}
              />
            </div>
          </div>

          <div className="xl:pl-8">
            {/* The page (section labels, the reader's seal) takes the ink at once: no proof needed. */}
            <SubHead>{w.accent}</SubHead>
            <ColorSwatches value={banner} onChange={chooseInk} label={w.accent} />
          </div>
        </div>
      </div>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- III. reading room

/*
 * Pictures of what each choice does, printed inside the choice itself, so the
 * reader sees the result instead of reading about it. All decorative (aria-hidden
 * in Segmented): the label beside each one still names the choice.
 */

/** A piece of lead type, "Aa", at the size the choice prints the paper in. */
function TypeSpecimen({ size }: { size: FontSize }) {
  const px = { small: 'text-[1.05rem]', medium: 'text-[1.4rem]', large: 'text-[1.8rem]' }[size];
  return <span className={cn('flex h-9 items-end font-display font-semibold leading-none', px)}>Aa</span>;
}

/** The time now, as the masthead would print it with this choice (a fixed 3:42 in the afternoon until the page has loaded). */
function ClockSpecimen({ clock }: { clock: ReaderPrefValue<'clock'> }) {
  // The current minute, as a number (useClientValue needs a value that compares equal between calls).
  const minute = useClientValue(() => Math.floor(Date.now() / 60_000), null);
  const date = minute === null ? new Date(2026, 0, 1, 15, 42) : new Date(minute * 60_000);
  return <span className="font-display text-[1.15rem] font-semibold leading-none tabular-nums">{formatClock(date, clock)}</span>;
}

/** Five lines of type: a straight block (the last line short), or a ragged right edge. */
const COLUMN_LINES = { justified: [100, 100, 100, 100, 58], ragged: [92, 76, 100, 68, 84] } as const;
function ColumnSpecimen({ columns }: { columns: ReaderPrefValue<'columns'> }) {
  return (
    <span className="flex w-12 flex-col gap-[3px] py-0.5">
      {COLUMN_LINES[columns].map((width, i) => (
        <span key={i} className="block h-[2.5px] rounded-[1px] bg-current opacity-65" style={{ width: `${width}%` }} />
      ))}
    </span>
  );
}

/** A corner of a colour plate (Penfield's reader, 1896), as a news photo would look: archival (sepia until pointed at) or in full colour. */
function PhotoSpecimen({ look }: { look: ReaderPrefValue<'photos'> }) {
  return (
    <span className="photo-specimen" data-look={look}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny local plate */}
      <img src="/plates/reader.webp" alt="" width={64} height={44} decoding="async" />
    </span>
  );
}

/** The hansom cab from the street banner: driving across, standing still, or an empty frame. */
function BannerSpecimen({ banner }: { banner: ReaderPrefValue<'banner'> }) {
  return (
    <span className="banner-specimen" data-banner-look={banner}>
      {banner !== 'hidden' && <span className="banner-specimen-cab" />}
    </span>
  );
}

const PREVIEWS: { [K in ReaderPref]: (value: ReaderPrefValue<K>) => React.ReactNode } = {
  clock: (value) => <ClockSpecimen clock={value} />,
  banner: (value) => <BannerSpecimen banner={value} />,
  photos: (value) => <PhotoSpecimen look={value} />,
  columns: (value) => <ColumnSpecimen columns={value} />,
};

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
  const slip = useI18n().t.settings.reading[name] as { title: string; options: Record<string, string> };
  return (
    <div className="flex flex-col gap-3 border-b border-rule/25 pb-5 last:border-b-0 last:pb-0 md:[&:nth-last-child(2)]:border-b-0 md:[&:nth-last-child(2)]:pb-0">
      <p className="font-display text-[1.1rem] font-semibold">{slip.title}</p>
      <Segmented<ReaderPrefValue<K>>
        fill
        even
        aria-label={slip.title}
        value={value}
        onChange={(next) => setReaderPref(name, next)}
        options={values.map((option) => ({ value: option, label: slip.options[option], preview: PREVIEWS[name](option) }))}
      />
    </div>
  );
}

export function ReadingRoomSection() {
  return (
    <LedgerEntry id="reading-room">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-10 md:gap-y-6">
        {PREF_SLIPS.map((slip) => (
          <PrefSlipRow key={slip.name} name={slip.name} values={slip.values as ReaderPrefValue<typeof slip.name>[]} />
        ))}
      </div>
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- IV. sections and papers

/*
 * Muted newspapers and words are saved the moment they change: in the account
 * (RLS: a reader writes only their own rows), or for a visitor in this
 * browser's cookies (lib/guest-prefs.ts), which the feed sends to get_feed.
 */

/**
 * Muted words: stories whose headline or summary contains one of them (as a
 * whole word) never appear on the front page. Saved straight away, one by one.
 */
function MutedWords({ userId, initialKeywords }: { userId: string | null; initialKeywords: string[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { t, fmt } = useI18n();
  const w = t.settings.sections;
  const max = userId ? MAX_MUTED_KEYWORDS : GUEST_MAX_MUTED_WORDS;

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
    const next = [...keywords, result.keyword].sort();
    if (keywords.length >= max || (!userId && !guestMutedWordsFit(next))) {
      setProblem(fmt(w.tooManyWords, { max: userId ? max : keywords.length }));
      return;
    }
    if (userId) {
      setBusy(true);
      const { error } = await createClient().from('muted_keywords').insert({ user_id: userId, keyword: result.keyword });
      setBusy(false);
      if (error) {
        showToast({ type: 'error', title: w.muteWordFailed, message: errorText(error, t) });
        return;
      }
    } else {
      saveGuestMutes({ ...readGuestMutes(), words: next });
    }
    setKeywords(next);
    setDraft('');
    setProblem(null);
  };

  const remove = async (keyword: string) => {
    setKeywords((list) => list.filter((k) => k !== keyword));
    if (!userId) {
      const mutes = readGuestMutes();
      saveGuestMutes({ ...mutes, words: mutes.words.filter((k) => k !== keyword) });
      return;
    }
    const { error } = await createClient().from('muted_keywords').delete().eq('user_id', userId).eq('keyword', keyword);
    if (error) {
      setKeywords((list) => [...list, keyword].sort());
      showToast({ type: 'error', title: w.unmuteFailed, message: errorText(error, t) });
    }
  };

  return (
    <div>
      <SubHead htmlFor="muted-word">{w.mutedWords}</SubHead>
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
                <span aria-hidden="true" className="block px-0.5 font-display text-[1.25rem] leading-none">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MutedPaper = { id: string; name: string };

/**
 * Muted newspapers: a list with Unmute on each, and a menu of every other
 * newspaper (grouped by section) with Mute beside it.
 */
function MutedPapers({
  userId,
  initial,
  sources,
  categories,
}: {
  userId: string | null;
  initial: MutedPaper[];
  sources: SourceOption[];
  categories: Category[];
}) {
  const [list, setList] = useState(initial);
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { t, fmt } = useI18n();
  const w = t.settings.sections;

  // The newspapers that can still be muted, under their sections.
  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          papers: sources.filter((s) => s.category_id === category.id && !list.some((m) => m.id === s.id)),
        }))
        .filter((group) => group.papers.length > 0),
    [categories, sources, list],
  );

  const saveGuest = (next: MutedPaper[]) => saveGuestMutes({ ...readGuestMutes(), sourceIds: next.map((paper) => paper.id) });

  const mute = async (event: React.FormEvent) => {
    event.preventDefault();
    const paper = sources.find((s) => s.id === choice);
    if (!paper) return;
    const next = [...list, { id: paper.id, name: paper.name }].sort((a, b) => a.name.localeCompare(b.name));
    if (userId) {
      setBusy(true);
      const { error } = await muteSource(userId, paper.id);
      setBusy(false);
      if (error) {
        showToast({ type: 'error', title: w.mutePaperFailed, message: errorText(error, t) });
        return;
      }
    } else {
      saveGuest(next);
    }
    setList(next);
    setChoice('');
  };

  const unmute = async (paper: MutedPaper) => {
    const next = list.filter((s) => s.id !== paper.id);
    setList(next);
    if (!userId) {
      saveGuest(next);
      return;
    }
    const { error } = await unmuteSource(userId, paper.id);
    if (error) {
      setList((current) => [...current, paper].sort((a, b) => a.name.localeCompare(b.name)));
      showToast({ type: 'error', title: w.unmuteFailed, message: errorText(error, t) });
    }
  };

  return (
    <div>
      <SubHead htmlFor="mute-paper">{w.mutedPapers}</SubHead>
      <form onSubmit={mute} className="flex flex-wrap items-start gap-2.5">
        <div className="min-w-0 flex-1 basis-52">
          <NativeSelect id="mute-paper" value={choice} onChange={(event) => setChoice(event.target.value)}>
            <option value="">{w.pickPaper}</option>
            {groups.map(({ category, papers }) => (
              <optgroup key={category.id} label={sectionText(t, getCategoryStyle(category.name).key, category.name).name}>
                {papers.map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline" disabled={busy || !choice}>
          {busy && <Spinner />}
          {w.mutePaper}
        </Button>
      </form>
      {list.length === 0 ? (
        <p className="mt-4 text-[0.95rem] italic text-muted-foreground">{w.noMutedPapers}</p>
      ) : (
        <ul className="mt-4 divide-y divide-dashed divide-rule/40 border-y border-rule/40" aria-label={w.yourPapers}>
          {list.map((paper) => (
            <li key={paper.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 font-display text-[1rem] font-semibold">{paper.name}</span>
              <Button variant="stamp" size="sm" onClick={() => unmute(paper)} aria-label={fmt(w.unmutePaper, { name: paper.name })}>
                {w.unmute}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A story the reader hid from their paper (quick-read sheet > More > Hide). */
export type HiddenStory = { id: string; title: string; slug: string };

/**
 * The stories an account hid, with a way to bring each one back. Only shown once
 * something is hidden (hiding is for accounts; visitors mute newspapers instead).
 */
function HiddenStories({ userId, initial }: { userId: string; initial: HiddenStory[] }) {
  const [list, setList] = useState(initial);
  const { showToast } = useToast();
  const { t, fmt } = useI18n();
  const w = t.settings.sections;
  if (list.length === 0) return null;

  const showAgain = async (story: HiddenStory) => {
    setList((current) => current.filter((s) => s.id !== story.id));
    const { error } = await unhideArticle(userId, story.id);
    if (error) {
      setList((current) => [story, ...current]);
      showToast({ type: 'error', title: w.showAgainFailed, message: errorText(error, t) });
    }
  };

  return (
    <div className="mt-8 border-t border-dashed border-rule/45 pt-6">
      <SubHead>{w.hiddenStories}</SubHead>
      <ul className="divide-y divide-dashed divide-rule/40 border-y border-rule/40" aria-label={w.hiddenStories}>
        {list.map((story) => (
          <li key={story.id} className="flex items-center justify-between gap-3 py-2">
            <SheetLink slug={story.slug} className="min-w-0 font-display text-[1rem] font-semibold leading-snug underline-offset-4 hover:underline">
              {cleanText(story.title)}
            </SheetLink>
            <Button variant="stamp" size="sm" onClick={() => showAgain(story)} aria-label={fmt(w.showAgainLabel, { title: cleanText(story.title) })}>
              {w.showAgain}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectionsAndSourcesSection({
  topics,
  userId,
  muted,
  sources,
  categories,
  keywords,
  hidden = [],
}: {
  topics: string[];
  /** null for a visitor: everything is kept in this browser. */
  userId: string | null;
  muted: MutedPaper[];
  /** Every newspaper in the paper, for the Mute menu. */
  sources: SourceOption[];
  categories: Category[];
  keywords: string[];
  /** The account's hidden stories, newest first. */
  hidden?: HiddenStory[];
}) {
  const w = useI18n().t.settings.sections;

  return (
    <LedgerEntry id="sections">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-0">
        <div className="md:border-r md:border-rule/30 md:pr-8">
          <SubHead>{w.yours}</SubHead>
          <div className="flex flex-wrap gap-2">
            {topics.length === 0 ? (
              <p className="text-[0.95rem] italic text-muted-foreground">{w.none}</p>
            ) : (
              topics.map((name) => <CategoryBadge key={name} name={name} />)
            )}
          </div>
          {/* May wrap with large type on a narrow phone rather than run off the page. */}
          <Button variant="outline" asChild className="mt-5 h-auto min-h-10 max-w-full whitespace-normal text-center">
            <Link href={SECTIONS_PATH}>{w.edit}</Link>
          </Button>
        </div>
        <div className="md:pl-8">
          <MutedPapers userId={userId} initial={muted} sources={sources} categories={categories} />
        </div>
      </div>
      <div className="mt-8 border-t border-dashed border-rule/45 pt-6">
        <MutedWords userId={userId} initialKeywords={keywords} />
      </div>
      {userId && <HiddenStories userId={userId} initial={hidden} />}
    </LedgerEntry>
  );
}

// ---------------------------------------------------------------- V. closing the account

/**
 * The reader must have signed in with Google in the last few minutes; otherwise
 * they are sent to Google once and come back here (`?delete=confirm`) with the
 * dialog open again.
 */
export function DangerZone({ openOnLoad = false }: { openOnLoad?: boolean }) {
  const [open, setOpen] = useState(openOnLoad);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const { t } = useI18n();
  const w = t.settings.close;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
    setNeedsGoogle(false);
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // On success the server redirects to the front page, so this only returns on failure.
    const result = await deleteAccount();
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
              <DialogDescription>{w.note}</DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {needsGoogle && <GoogleButton next={`${SETTINGS_PATH}?delete=confirm`} label={w.google} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                {t.common.cancel}
              </Button>
              {!needsGoogle && (
                <Button type="submit" variant="destructive" disabled={busy}>
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
