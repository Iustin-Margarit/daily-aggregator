import { ScrollDivider } from '@/components/site/scroll-divider';
import { Skeleton } from '@/components/ui/skeleton';

/*
 * The grey proofs shown the moment a reader taps a tab, while the server sets
 * the page (each route's loading.tsx). They follow the real pages' shapes, so
 * nothing jumps when the page arrives: the title block of PageHeader, then a
 * margin column beside the content on wide screens.
 */

function TitleProof() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="mt-3 h-11 w-64 max-w-full sm:h-12 sm:w-80" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
    </div>
  );
}

function MarginProof({ rows }: { rows: number }) {
  return (
    <div className="hidden space-y-3 lg:block lg:pr-9">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** Saved: the title, the folder index and a column of clippings. */
export function SavedProof() {
  return (
    <div className="container py-8 sm:py-10" aria-busy="true">
      <TitleProof />
      <div className="mt-8 grid gap-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-0">
        <MarginProof rows={4} />
        <div className="space-y-5 lg:border-l lg:border-rule/40 lg:pl-9">
          <Skeleton className="h-10 w-full sm:w-80" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b border-rule/30 pb-5">
              <Skeleton className="aspect-[4/3] w-28 shrink-0 sm:w-40" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sections: the title and the stamps, two to four in a row. */
export function SectionsProof() {
  return (
    <div className="container py-8 sm:py-10" aria-busy="true">
      <TitleProof />
      <ScrollDivider className="mb-8 mt-8" />
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-0">
        <MarginProof rows={3} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:pl-9 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-52 w-full sm:h-56" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Settings: the nameplate, the ledger's index and its entries. */
export function LedgerProof() {
  return (
    <div className="container pb-8 pt-10 sm:pt-14" aria-busy="true">
      <Skeleton className="h-44 w-full sm:h-40" />
      <div className="mt-8 grid gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-0">
        <MarginProof rows={6} />
        <div className="space-y-6 lg:pl-9">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Any other page (the guests' front page, the newsroom): a title and a few columns. */
export function PageProof() {
  return (
    <div className="container py-8 sm:py-10" aria-busy="true">
      <TitleProof />
      <ScrollDivider className="mb-8 mt-8" />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
