'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, VolumeX } from 'lucide-react';
import { deleteAccount, updateAppearance, updateEmail, updatePassword, updateProfile } from '@/app/actions/profile';
import { unmuteSource } from '@/components/articles/moderation';
import { CategoryBadge } from '@/components/articles/category-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ActionResult, FontSize } from '@/lib/types';
import { cn } from '@/lib/utils';

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

export function ProfileSection({ username, avatarColor, email }: { username: string; avatarColor: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  const [name, setName] = useState(username);
  const [color, setColor] = useState(avatarColor);
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Your byline</CardTitle>
          <CardDescription>Your username is printed under your letters to the editor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <ColoredAvatar username={name} color={color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-medium">{name || 'Your name'}</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={30} required />
          </div>
          <div className="space-y-2">
            <Label>Avatar colour</Label>
            <ColorSwatches value={color} onChange={setColor} label="Avatar colour" />
            <input type="hidden" name="avatar_color" value={color} />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <SubmitButton disabled={name === username && color === avatarColor}>Save profile</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}

const THEMES = [
  { value: 'light', label: 'Morning', icon: Sun },
  { value: 'dark', label: 'Night', icon: Moon },
  { value: 'system', label: 'Device', icon: Monitor },
];

export function AppearanceSection({ bannerColor, fontSize }: { bannerColor: string; fontSize: FontSize }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] = useState(bannerColor);
  const [size, setSize] = useState<FontSize>(fontSize);
  const [state, action] = useActionState(updateAppearance, null);
  useActionFeedback(state);
  useEffect(() => setMounted(true), []);

  // Live preview of the font size; revert to the saved value when leaving the page.
  const savedSize = useRef(fontSize);
  savedSize.current = fontSize;
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
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Printing preferences</CardTitle>
          <CardDescription>The edition applies instantly on this device. Type size and accent ink are saved to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Edition</Label>
            <div className="grid max-w-md grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={mounted && theme === value}
                  className={cn(
                    'label flex flex-col items-center gap-1.5 border px-3 py-3 transition-colors',
                    mounted && theme === value ? 'border-rule bg-foreground text-background' : 'border-rule/40 hover:border-rule',
                  )}
                >
                  <Icon className="h-5 w-5" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="block">Type size</Label>
            <Segmented<FontSize>
              aria-label="Text size"
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

          <div className="space-y-3">
            <Label>Accent ink</Label>
            <div className="border border-border bg-background px-4 py-3" style={accentVariables(banner)} data-accent="" aria-hidden="true">
              <p className="kicker">World · Preview</p>
              <p className="headline mt-1 text-lg">Section labels are printed in this ink</p>
            </div>
            <ColorSwatches value={banner} onChange={setBanner} label="Accent ink" />
            <input type="hidden" name="banner_color" value={banner} />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <SubmitButton disabled={banner === bannerColor && size === fontSize}>Save appearance</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}

export function TopicsSection({ topics }: { topics: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your sections</CardTitle>
        <CardDescription>Your front page shows these sections by default.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {topics.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No sections selected, so your paper includes everything.</p>
        ) : (
          topics.map((name) => <CategoryBadge key={name} name={name} />)
        )}
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
        <Button variant="outline" asChild>
          <Link href="/onboarding">Edit sections</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function MutedSourcesSection({ userId, sources }: { userId: string; sources: { id: string; name: string }[] }) {
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
    <Card>
      <CardHeader>
        <CardTitle>Muted sources</CardTitle>
        <CardDescription>Papers you muted never appear in your edition. Mute a source from any story’s menu.</CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have not muted any sources.</p>
        ) : (
          <ul className="divide-y border">
            {list.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <VolumeX className="h-4 w-4 text-muted-foreground" /> {source.name}
                </span>
                <Button variant="ghost" size="sm" onClick={() => unmute(source)}>
                  Unmute
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function EmailSection({ email }: { email: string }) {
  const [state, action] = useActionState(updateEmail, null);
  useActionFeedback(state);
  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Email address</CardTitle>
          <CardDescription>
            Currently <span className="font-medium text-foreground">{email}</span>. You will need to confirm the change by email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="new-email">New email</Label>
            <Input id="new-email" name="email" type="email" autoComplete="email" placeholder="new@example.com" required />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <SubmitButton>Change email</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}

export function PasswordSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const [next, setNext] = useState('');
  const [state, action] = useActionState(updatePassword, null);
  useActionFeedback(state, () => {
    formRef.current?.reset();
    setNext('');
  });
  return (
    <Card>
      <form ref={formRef} action={action}>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use at least 8 characters. A long passphrase is best.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-sm gap-4">
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
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <SubmitButton>Change password</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError(null);
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // On success the server redirects to the front page, so this only returns on failure.
    const result = await deleteAccount(password);
    setBusy(false);
    if (result && !result.ok) setError(result.message ?? 'Could not delete the account.');
  };

  return (
    <Card className="border-destructive/60">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your account, saved stories, likes and letters. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardFooter>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <form onSubmit={confirm} className="grid min-w-0 grid-cols-1 gap-4">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                Everything you saved, liked and wrote will be removed for good. Enter your password to confirm it is really you.
              </DialogDescription>
            </DialogHeader>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={busy || password.length === 0}>
                {busy && <Spinner />}
                Delete account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
