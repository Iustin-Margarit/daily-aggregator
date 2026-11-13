import { Skeleton } from '@/components/ui/skeleton';

export function ArticleCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-3/2 w-full" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="news-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <ArticleCardSkeleton />
        </div>
      ))}
    </div>
  );
}
