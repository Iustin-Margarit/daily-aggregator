import { ArticleGridSkeleton } from '@/components/articles/article-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeedLoading() {
  return (
    <div className="container py-5 sm:py-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-4 h-[96px] w-full" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="aspect-video w-full" />
        </div>
        <div className="space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <ArticleGridSkeleton count={3} />
      </div>
    </div>
  );
}
