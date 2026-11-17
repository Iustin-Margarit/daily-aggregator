'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Ornament } from '@/components/site/ornament';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
};

type Toast = ToastOptions & { id: number };

type ToastContextValue = {
  showToast: (toast: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/*
 * A notice is printed outside any sheet or dialog, so a dialog (the quick-read sheet) counts a press on it as a
 * press "outside" and closes. Radix settles that on the click, after the notice's own button has already
 * removed the notice from the page, so the press can no longer be traced to it by where it landed: the
 * notices say so instead, at the moment of the press (toastWasJustPressed).
 */
let lastPress = 0;
const notePress = () => {
  lastPress = Date.now();
};
/** True while a press on a notice is under way or has just finished. */
export function toastWasJustPressed(target?: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('[data-toasts]')) return true;
  return Date.now() - lastPress < 800;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

/**
 * One notice, printed as a slip of paper: a double rule round it and a rule
 * down its left edge in the notice's ink (brass, or red for a failure), with a
 * wax seal when something was done and a printer's fist when it is news.
 * It goes by itself after a while (a fine rule along its foot runs down to show
 * how long is left), but waits while the reader points at it with a mouse or is
 * on it with the keyboard, so an Undo cannot slip away under them.
 */
function ToastSlip({ toast, paused, onDismiss }: { toast: Toast; paused: boolean; onDismiss: (id: number) => void }) {
  const { t } = useI18n();
  const type = toast.type ?? 'info';
  const duration = toast.duration ?? (toast.action ? 7000 : 4500);
  const remaining = useRef(duration);

  // The timer and the running-down rule stop and start together, so the rule is empty when the notice goes.
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [paused, toast.id, onDismiss]);

  const failed = type === 'error' || type === 'warning';
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-[3px] border-[3px] border-double border-rule/45 bg-popover py-3.5 pl-4 pr-3 text-popover-foreground shadow-float',
        'before:absolute before:inset-y-1.5 before:left-1 before:w-[3px] before:rounded-[1px]',
        failed ? 'before:bg-destructive/70' : 'before:bg-(--ink-gold)',
        'animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-right-4',
      )}
    >
      {!failed && (
        <span className="mt-0.5 flex w-6 shrink-0 justify-center" aria-hidden="true">
          <Ornament
            name={type === 'success' ? 'seal' : 'fist'}
            className={cn(type === 'success' ? 'h-[1.4rem]' : 'h-[0.9rem] mt-1', '[--ornament-ink:var(--brass-ink)]')}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('font-display text-base font-semibold leading-5', failed && 'text-destructive')}>{toast.title}</p>
        {toast.message && <p className="mt-1 text-sm text-muted-foreground">{toast.message}</p>}
        {toast.action && (
          <button
            type="button"
            className="label mt-2 underline decoration-(--ink-gold) decoration-1 underline-offset-4 hover:decoration-2"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-1.5 shrink-0 rounded-[2px] px-1.5 font-display text-[1.35rem] leading-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={t.common.dismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
      <span
        aria-hidden="true"
        className={cn('toast-time', failed ? 'bg-destructive/60' : 'bg-(--ink-gold)')}
        style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const nextId = useRef(1);
  const shelf = useRef<HTMLDivElement>(null);

  /*
   * Whether the notices wait: a mouse over one of them, or the keyboard's focus on one (a finger's tap focuses a
   * button too, but that is not the keyboard: it must not hold them). Asked again whenever a notice goes, because a
   * notice removed under the mouse or with the focus on its button sends neither "leave" nor "blur": the notices
   * then waited for good (the bug of 2026-11-17: two "Removed from your saved stories" that never went).
   */
  const recheck = useCallback(() => {
    const el = shelf.current;
    if (!el) return;
    const active = document.activeElement;
    setHovered(el.matches(':hover') && matchMedia('(hover: hover)').matches);
    setFocused(Boolean(active && el.contains(active) && active.matches(':focus-visible')));
  }, []);
  const dismiss = useCallback(
    (id: number) => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      // Once the notice is off the page (the next frame).
      requestAnimationFrame(recheck);
    },
    [recheck],
  );

  // Stable identity: components can safely list showToast in effect deps.
  const showToast = useCallback((toast: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
       * Below 1024px the reader's places are a 56px bar at the bottom (components/site/site-header.tsx, sized in
       * px), so the notices stand just above it there; from 1024px, in the corner.
       */}
      <div
        ref={shelf}
        data-toasts=""
        aria-live="polite"
        onPointerDownCapture={notePress}
        onClickCapture={notePress}
        onPointerOver={(event) => event.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={(event) => setFocused(event.target.matches(':focus-visible'))}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-100 flex flex-col items-center gap-2 p-3 sm:bottom-[calc(72px+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:items-end sm:p-0 lg:bottom-4"
      >
        {toasts.map((toast) => (
          <ToastSlip key={toast.id} toast={toast} paused={hovered || focused} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
