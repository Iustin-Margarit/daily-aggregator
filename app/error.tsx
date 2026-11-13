'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/site/empty-state';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container max-w-2xl py-16">
      <EmptyState
        icon={AlertTriangle}
        title="Stop the presses"
        description="Something went wrong while printing this page. Please try again; if it keeps happening, check that the database is running."
        action={
          <>
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              Front page
            </Button>
          </>
        }
      />
    </div>
  );
}
