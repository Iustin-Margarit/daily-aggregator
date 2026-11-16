'use client';

import { useRef } from 'react';
import { useScrollPeek } from '@/lib/use-scroll-peek';

/**
 * A <nav> ribbon that may scroll sideways on a phone (the Settings contents, the Saved folders): it glides along
 * and back once when first seen, so readers know it scrolls (lib/use-scroll-peek.ts).
 */
export function PeekNav({ kind, ...props }: React.ComponentProps<'nav'> & { kind: string }) {
  const ref = useRef<HTMLElement>(null);
  useScrollPeek(ref, kind);
  return <nav ref={ref} {...props} />;
}
