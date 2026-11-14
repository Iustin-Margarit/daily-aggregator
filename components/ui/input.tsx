import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'field-antique flex h-11 w-full px-3.5 py-1 font-serif text-base text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:italic placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.95rem]',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
