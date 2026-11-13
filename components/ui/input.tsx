import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full border border-input bg-card/70 px-3 py-1 font-serif text-base text-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:italic placeholder:text-muted-foreground/80 focus-visible:border-rule focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-rule disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.95rem]',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
