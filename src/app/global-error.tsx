'use client';

import { useEffect } from 'react';

// Only renders if the root layout itself throws — it replaces the whole document,
// so it can't rely on app providers, fonts, or globals.css. Keep it self-contained.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fffdf5',
          color: '#000',
          fontFamily: 'system-ui, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
            border: '3px solid #000',
            boxShadow: '8px 8px 0 0 #000',
            background: '#fff',
            padding: '1.75rem 1.5rem',
          }}
        >
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.75rem', textTransform: 'uppercase' }}>
            Something went wrong
          </h1>
          <p style={{ fontWeight: 500, margin: '0 0 1.5rem', lineHeight: 1.45 }}>
            The app hit an unexpected error. Try reloading — if it keeps happening, come back in a bit.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              display: 'inline-block',
              border: '3px solid #000',
              background: '#ff5a5f',
              color: '#000',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '0.75rem 1.5rem',
              boxShadow: '4px 4px 0 0 #000',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
