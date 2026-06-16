'use client';

import { useEffect } from 'react';
import Link from '@/Features/Shared/TransitionLink';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in server logs (and any error tracker wired up later).
    console.error('[app error]', error);
  }, [error]);

  return (
    <AppShell>
      <BlobField />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
        <Card color="lavender" style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <span className="neo-sticker" aria-hidden="true">Oof</span>
          <h1 style={{ fontFamily: 'var(--font-accent)', fontSize: '1.8rem', margin: '0.5rem 0 0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ fontWeight: 500, marginBottom: '1.25rem' }}>
            That wasn&apos;t meant to happen. You can try again, or head back to your library.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Button variant="secondary" fullWidth onClick={reset}>Try again</Button>
            <Link href="/">
              <Button variant="primary" fullWidth>Back to library</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
