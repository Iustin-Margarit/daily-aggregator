'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

import { cn } from '@/lib/utils';

/** A ledger box: a double-ruled square that gets a quick tick in ink, a little larger than the box, as if by pen. */
const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer relative h-5 w-5 shrink-0 rounded-[1px] border-[3px] border-double border-rule/70 bg-card transition-colors hover:border-(--ink-gold) focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="ink-tick absolute -top-1.5 left-0 flex text-(--ink-accent)">
        {/* A pen tick, typeset (U+2713, never drawn as an emoji). */}
        <span aria-hidden="true" className="block -rotate-6 font-display text-[1.25rem] font-bold leading-none">✓</span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
