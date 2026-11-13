'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/** Goes back when the reader came from inside the app, otherwise to the feed. */
export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/feed"
      onClick={(event) => {
        if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
          event.preventDefault();
          router.back();
        }
      }}
      className="label inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to the paper
    </Link>
  );
}
