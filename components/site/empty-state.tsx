import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/** A printed notice box ("Notice to readers"). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('paper-box mx-auto flex max-w-2xl flex-col items-center px-6 py-12 text-center', className)}>
      <Icon className="mb-3 h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
      <p className="label text-muted-foreground">Notice to readers</p>
      <h3 className="headline mt-2 text-2xl">{title}</h3>
      {description && <div className="mt-2 max-w-md text-[0.95rem] italic text-muted-foreground">{description}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
