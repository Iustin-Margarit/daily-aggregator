import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full border border-input bg-card/70 px-3 py-2 font-serif text-base placeholder:italic placeholder:text-muted-foreground/80 focus-visible:border-rule focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-rule disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.95rem]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
