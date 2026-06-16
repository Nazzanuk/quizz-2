'use client';

import Link from '@/Features/Shared/TransitionLink';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import styles from './QuizUnavailable.module.css';

interface QuizUnavailableProps {
  // 404s get a "no longer here" message; anything else is treated as a
  // transient fetch failure the user can retry.
  notFound?: boolean;
}

export default function QuizUnavailable({ notFound = false }: QuizUnavailableProps) {
  return (
    <AppShell>
      <BlobField />
      <div className={styles.wrap}>
        <Card color="lavender" className={styles.card}>
          <span className="neo-sticker" aria-hidden="true">Hmm</span>
          <h1 className={styles.title}>
            {notFound ? 'Quiz not found' : "Couldn't load this quiz"}
          </h1>
          <p className={styles.body}>
            {notFound
              ? 'This quiz may have been deleted or made private, so the link no longer works.'
              : 'Something went wrong reaching this quiz. Check your connection and try again.'}
          </p>
          <div className={styles.actions}>
            {!notFound && (
              <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
                Try again
              </Button>
            )}
            <Link href="/" className={styles.homeLink}>
              <Button variant="primary" fullWidth>Back to library</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
