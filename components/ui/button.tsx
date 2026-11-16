import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * Ticket-stub buttons: crisp 3px corners and a second hairline printed just
 * inside the edge. Solid buttons are inked (sepia by day, brass by night);
 * "stamp" is a rubber-stamped action in typewriter capitals.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] font-display font-semibold tracking-[0.01em] transition-[color,background-color,border-color,box-shadow,transform] active:translate-y-px focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border border-primary bg-primary text-primary-foreground shadow-[inset_0_0_0_2px_hsl(var(--primary)),inset_0_0_0_3px_hsl(var(--primary-foreground)/0.4),0_1px_2px_rgb(0_0_0/0.15)] hover:bg-primary/90',
        destructive:
          'border border-destructive bg-destructive text-destructive-foreground shadow-[inset_0_0_0_2px_hsl(var(--destructive)),inset_0_0_0_3px_hsl(var(--destructive-foreground)/0.4)] hover:bg-destructive/90',
        outline:
          'frame-ruled text-foreground',
        secondary:
          'border border-rule/30 bg-secondary text-secondary-foreground shadow-[inset_0_0_0_2px_hsl(var(--secondary)),inset_0_0_0_3px_hsl(var(--rule)/0.18)] hover:bg-accent',
        ghost: 'text-foreground hover:bg-foreground/6',
        link: 'text-foreground underline decoration-1 underline-offset-4 hover:decoration-2',
        stamp:
          'border-[3px] border-double border-current/35 bg-transparent font-typewriter font-normal uppercase tracking-[0.06em] text-foreground/80 hover:border-current/70 hover:text-foreground',
      },
      size: {
        default: 'h-10 px-5 text-[0.95rem]',
        sm: 'h-8 px-3.5 text-[0.85rem]',
        lg: 'h-12 px-7 text-[1.02rem]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
