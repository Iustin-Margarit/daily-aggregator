import { Fragment } from 'react';

/**
 * Text made of phrases joined by " · " (a motto, "Vol. II · No. 319"), printed so a
 * narrow screen only breaks it between phrases: each phrase stays whole and the dot
 * stays at the end of the line before, so no line starts with "·" or is a lone number.
 */
export function Phrases({ text }: { text: string }) {
  const parts = text.split(' · ');
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          <span className="whitespace-nowrap">
            {part}
            {index < parts.length - 1 && ' ·'}
          </span>
          {index < parts.length - 1 && ' '}
        </Fragment>
      ))}
    </>
  );
}
