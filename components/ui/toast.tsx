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

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

/**
 * One notice, printed as a slip of paper: a double rule round it and a rule
 * down its left edge in the notice's ink (brass, or red for a failure), with a
 * wax seal when something was done and a printer's fist when it is news.
 * It goes after a while, but never while the reader points at it or is on
 * it with the keyboard, so an Undo cannot slip away under them.
 */
function ToastSlip({
  toast,
  paused,
  onHover,
  onDismiss,
}: {
  toast: Toast;
  paused: boolean;
  onHover: (over: boolean) => void;
  onDismiss: (id: number) => void;
}) {
  const { t } = useI18n();
  const type = toast.type ?? 'info';
  const remaining = useRef(toast.duration ?? (toast.action ? 7000 : 4500));

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(1500, remaining.current - (Date.now() - started));
    };
  }, [paused, toast.id, onDismiss]);

  const failed = type === 'error' || type === 'warning';
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      onPointerEnter={(event) => event.pointerType === 'mouse' && onHover(true)}
      onPointerLeave={() => onHover(false)}
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-[3px] border-[3px] border-double border-rule/45 bg-popover py-3.5 pl-4 pr-3 text-popover-foreground shadow-float',
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
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

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
        data-toasts=""
        aria-live="polite"
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-100 flex flex-col items-center gap-2 p-3 sm:bottom-[calc(72px+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:items-end sm:p-0 lg:bottom-4"
      >
        {toasts.map((toast) => (
          <ToastSlip key={toast.id} toast={toast} paused={hovered || focused} onHover={setHovered} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
