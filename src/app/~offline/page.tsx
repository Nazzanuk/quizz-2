'use client';

import AppShell from '@/Features/Shared/AppShell';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import styles from './page.module.css';

export default function OfflinePage() {
  return (
    <AppShell variant="focused">
      <div className={styles.container}>
        <Card color="lavender" className={styles.card}>
          <h1 className={styles.heading}>You are offline</h1>
          <p className={styles.body}>
            Quiz Dart needs a connection to load quizzes. Check your network and
            try again.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Button variant="secondary" fullWidth onClick={() => window.location.assign('/')}>
              Go home
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
