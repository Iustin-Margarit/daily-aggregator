import { Ornament } from '@/components/site/ornament';
import { cn } from '@/lib/utils';

/** Work in progress: the engraved cogwheel of Settings, turning slowly in the ink of the text around it. */
export function Spinner({ className }: { className?: string }) {
  return <Ornament name="gear" className={cn('h-4 animate-[spin_1.6s_linear_infinite] [--ornament-ink:currentColor]', className)} />;
}
