import { ArticleGridSkeleton } from '@/components/articles/article-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeedLoading() {
  return (
    <div className="container pt-5 sm:pt-6">
      <Skeleton className="h-[19rem] w-full rounded-[3px] sm:h-[22rem]" />
      <Skeleton className="mt-8 h-9 w-72" />
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-[2px]" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-[4/3] w-full rounded-[3px]" />
        <Skeleton className="h-96 w-full rounded-[3px]" />
      </div>
      <div className="mt-10">
        <ArticleGridSkeleton count={3} />
      </div>
    </div>
  );
}
