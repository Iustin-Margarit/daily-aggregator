import { Skeleton } from '@/components/ui/skeleton';

export default function ArticleLoading() {
  return (
    <div className="container max-w-4xl py-6 sm:py-10">
      <Skeleton className="h-5 w-16" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="mt-4 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-3/4" />
      <Skeleton className="mt-4 h-4 w-60" />
      <Skeleton className="mt-6 aspect-video w-full" />
      <Skeleton className="mt-6 h-6 w-full" />
      <Skeleton className="mt-2 h-6 w-5/6" />
    </div>
  );
}
