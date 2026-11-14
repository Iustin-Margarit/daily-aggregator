import Link from 'next/link';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';

export default function ArticleNotFound() {
  return (
    <div className="container max-w-2xl py-16">
      <EmptyState
        engraving="kitten-peer"
        title="This story has been pulled"
        description="Stories stay in the archive for 30 days unless a reader saved them. This one is no longer on file."
        action={
          <Button asChild>
            <Link href="/feed">Back to the paper</Link>
          </Button>
        }
      />
    </div>
  );
}
