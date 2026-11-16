'use client';

import { useEffect, type RefObject } from 'react';

/*
 * "This row scrolls": a ribbon that does not fit (the departments, the Settings contents, the Saved folders) glides
 * a third of its width to the side once when it first comes into view, then eases back and stays still. Below
 * 1024px only (wider screens show everything, or the fade), on the reader's first few visits only, never when
 * the device asks for less motion, and a touch, a wheel or a key on the ribbon stops it at once, where it is.
 * The faded edge (styles: .dept-bar, .folder-index) keeps hinting without moving.
 */

const VISITS_KEY = 'daily-aggregator:peek-visits:v1';
const VISIT_FLAG = 'daily-aggregator:peek-visit';
const MAX_VISITS = 3;
const shown = new Set<string>();

/** This browser's visit number (a visit = a browser session), counted once per session. */
function visitNumber(): number {
  try {
    let visits = Number(localStorage.getItem(VISITS_KEY) ?? '0') || 0;
    if (!sessionStorage.getItem(VISIT_FLAG)) {
      visits += 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      sessionStorage.setItem(VISIT_FLAG, '1');
    }
    return visits;
  } catch {
    // Storage blocked (a private window): no counting, so no peeking either.
    return MAX_VISITS + 1;
  }
}

/** Already peeked in this visit (one peek per kind of ribbon per visit, not one per page). */
function peekedThisVisit(kind: string): boolean {
  if (shown.has(kind)) return true;
  try {
    return sessionStorage.getItem(`${VISIT_FLAG}:${kind}`) === '1';
  } catch {
    return true;
  }
}

function notePeek(kind: string) {
  shown.add(kind);
  try {
    sessionStorage.setItem(`${VISIT_FLAG}:${kind}`, '1');
  } catch {
    // Kept in memory only.
  }
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function useScrollPeek(ref: RefObject<HTMLElement | null>, kind: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (peekedThisVisit(kind) || visitNumber() > MAX_VISITS) return;

    let frame = 0;
    let timer = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    const events = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const;
    for (const name of events) el.addEventListener(name, stop, { passive: true });

    /** Glides scrollLeft from where it is to `to` in `ms`, then calls `next`. */
    const glide = (to: number, ms: number, next?: () => void) => {
      const from = el.scrollLeft;
      const start = performance.now();
      const step = (now: number) => {
        if (stopped) return;
        const t = Math.min(1, (now - start) / ms);
        el.scrollLeft = from + (to - from) * ease(t);
        if (t < 1) frame = requestAnimationFrame(step);
        else next?.();
      };
      frame = requestAnimationFrame(step);
    };

    const peek = () => {
      const room = el.scrollWidth - el.clientWidth - el.scrollLeft;
      // Fits, or (almost) nothing more this way: nothing to show.
      if (room < 24) return;
      notePeek(kind);
      const home = el.scrollLeft;
      const distance = Math.min(room, el.clientWidth * 0.35);
      glide(home + distance, 850, () => {
        timer = window.setTimeout(() => glide(home, 750), 350);
      });
    };

    // When at least most of it is on screen, after a moment (the page settles first).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || stopped) return;
        observer.disconnect();
        timer = window.setTimeout(peek, 700);
      },
      { threshold: 0.8 },
    );
    observer.observe(el);

    return () => {
      stop();
      observer.disconnect();
      for (const name of events) el.removeEventListener(name, stop);
    };
  }, [ref, kind]);
}
