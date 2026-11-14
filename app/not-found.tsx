import Link from 'next/link';
import { Logo } from '@/components/site/logo';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="paper container flex min-h-screen max-w-2xl flex-col py-8">
      <Logo />
      <div className="flex flex-1 items-center">
        <EmptyState
          className="w-full"
          engraving="kitten-peer"
          title="This page was never printed"
          description="The office cat searched every column. The page you want does not exist, or it was pulled from an earlier edition."
          action={
            <Button asChild>
              <Link href="/">Back to the front page</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
