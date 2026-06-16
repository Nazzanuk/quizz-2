import Link from '@/Features/Shared/TransitionLink';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';

export default function NotFound() {
  return (
    <AppShell>
      <BlobField />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
        <Card color="lavender" style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <span className="neo-sticker" aria-hidden="true">404</span>
          <h1 style={{ fontFamily: 'var(--font-accent)', fontSize: '1.8rem', margin: '0.5rem 0 0.75rem' }}>
            Page not found
          </h1>
          <p style={{ fontWeight: 500, marginBottom: '1.25rem' }}>
            That link doesn&apos;t lead anywhere. It may have been moved, deleted, or never existed.
          </p>
          <Link href="/">
            <Button variant="primary" fullWidth>Back to library</Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
