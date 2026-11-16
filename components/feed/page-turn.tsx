'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wraps one page of a list. When the server sends another page (a page link, Back or
 * Forward), the new page swings in from the side it came from (styles: .page-turn-*) and
 * the reader is brought back to the top of the list if they had scrolled past it.
 */
export function PageTurn({ page, children }: { page: number; children: React.ReactNode }) {
  const top = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(page);
  const [dir, setDir] = useState<'next' | 'prev' | null>(null);
  if (shown !== page) {
    setDir(page > shown ? 'next' : 'prev');
    setShown(page);
  }
  useEffect(() => {
    if (!dir) return;
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }, [shown, dir]);

  return (
    <>
      <div ref={top} className="scroll-mt-20" />
      {/* A new key on each page, so the new page swings in once. */}
      <div key={shown} className={cn(dir === 'next' && 'page-turn-next', dir === 'prev' && 'page-turn-prev')}>
        {children}
      </div>
    </>
  );
}
