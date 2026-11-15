import * as React from 'react';
import { cn } from '@/lib/utils';

/** A styled native <select>: accessible and works well on mobile. */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'field-antique flex h-10 w-full appearance-none py-1 pl-3.5 pr-9 font-label text-[0.92rem] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    {/* The small brass caret the account menu and More use. */}
    <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.8rem] text-(--ink-gold)">▾</span>
  </div>
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
