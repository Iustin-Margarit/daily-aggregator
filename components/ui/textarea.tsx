import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'field-antique flex min-h-[80px] w-full px-3.5 py-2 font-serif text-base placeholder:italic placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.95rem]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
