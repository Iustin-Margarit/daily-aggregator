import { cn } from '@/lib/utils';

/**
 * A paragraph that opens with an illuminated initial: its first letter in
 * brass inside an engraved Victorian frame (styles: .initial). The letter and
 * the rest of the word are adjacent inline text, so screen readers read the
 * word whole.
 */
export function DropCap({ text, className }: { text: string; className?: string }) {
  // The first letter or digit becomes the initial, with any opening quote or bracket before it.
  const match = /^[“"'‘(\[]*(?:\p{L}|\p{N})/u.exec(text);
  if (!match) return <p className={className}>{text}</p>;
  const initial = match[0];
  return (
    <p className={cn('after:block after:clear-both', className)}>
      <span className="initial" aria-hidden="true">
        <span className="initial-letter">{initial}</span>
      </span>
      <span className="sr-only">{initial}</span>
      {text.slice(initial.length)}
    </p>
  );
}
