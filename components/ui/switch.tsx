'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

/** A brass slide switch in a double-ruled slot: the brass plate sits to the right when it is on. */
const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[2px] border-[3px] border-double p-px transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-(--ink-gold) data-[state=checked]:bg-(--ink-gold)/20 data-[state=unchecked]:border-rule/50 data-[state=unchecked]:bg-card',
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-3.5 w-4 rounded-[1px] border border-black/25 shadow-[inset_0_1px_0_rgb(255_255_255/0.45)] transition-transform data-[state=checked]:translate-x-[1.05rem] data-[state=checked]:bg-(--ink-gold) data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-rule/45',
        )}
      />
    </SwitchPrimitives.Root>
  ),
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
