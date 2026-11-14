'use client';

/**
 * The last safety net: shown only when the root layout itself fails, so it
 * brings its own <html> and plain styles (no fonts, no theme).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#efe6d6',
          color: '#2a1f17',
          fontFamily: 'Georgia, "Times New Roman", serif',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem', border: '4px double rgba(120, 88, 40, 0.55)', padding: '2rem 1.75rem', background: '#f8f1e3' }}>
          <p style={{ margin: 0, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '0.8rem', color: '#8b2a1d' }}>The Daily Aggregator</p>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontStyle: 'italic' }}>Stop the presses</h1>
          <p style={{ margin: '0.75rem 0 1.5rem', lineHeight: 1.5 }}>The paper could not be printed just now. Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ font: 'inherit', padding: '0.6rem 1.4rem', border: '1px solid #2a1f17', background: '#2a1f17', color: '#f8f1e3', cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
