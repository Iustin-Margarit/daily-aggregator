'use client';

import { useParams } from 'next/navigation';
import { QuickRead } from '@/components/story/quick-read';

/** The sheet opens at once with the copy of the story the reader just pressed, while the server sends its own. */
export default function QuickReadLoading() {
  const { id } = useParams<{ id: string }>();
  return <QuickRead slug={id} />;
}
